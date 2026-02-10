import http from "http";
import url from "url";
import fs from "fs";
import Database from "../Database/Database.js";

const configPath = new URL("./db.config.json", import.meta.url);
let dbConfig;
try {
  dbConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
  console.error("Failed to load app/db.config.json:", err.message);
  process.exit(1);
}

export default class Server {
  constructor(port) {
    this.port = port;

    this.insertDB = new Database({
      host: dbConfig.host,
      user: dbConfig.insert.user,        // INSERT + SELECT
      password: dbConfig.insert.password,
      database: dbConfig.database,
    });

    this.readonlyDB = new Database({
      host: dbConfig.host,
      user: dbConfig.readonly.user,   // SELECT only
      password: dbConfig.readonly.password,
      database: dbConfig.database,
    });
  }

  async start() {
       try {
      console.log("Starting server...");

      await this.insertDB.ensureTableExists();
      console.log("Table ensured");

      await this.insertDB.seedPatientsIfNeeded();
      console.log("Patient data seeded (if needed)");

      const server = http.createServer(this.handleRequest.bind(this));

      server.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);
      });

    } catch (err) {
      console.error("Server failed to start:", err);
    }
  }

  async handleRequest(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const parsedUrl = url.parse(req.url, true);

    if (req.method === "POST" && parsedUrl.pathname === "/insert") {
      await this.handleInsert(res);
    }
    else if (req.method === "GET" && parsedUrl.pathname === "/select") {
      await this.handleSelect(parsedUrl, res);
    }
    else {
      res.writeHead(404);
      res.end("Not Found");
    }
  }

  async handleInsert(res) {
    await this.insertDB.ensureTableExists();
    await this.insertDB.insertDefaultPatients();

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Patients inserted successfully");
  }

  async handleSelect(parsedUrl, res) {
    const query = parsedUrl.query.q;

    if (!query || !query.trim().toLowerCase().startsWith("select")) {
      res.writeHead(403);
      res.end("Only SELECT statements are allowed");
      return;
    }

    const result = await this.readonlyDB.runSelectQuery(query);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result, null, 2));
  }
}


const server = new Server(3000);
server.start();
