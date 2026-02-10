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

class ApiServer {
  constructor(port) {
    this.port = port;

    this.insertDB = new Database({
      host: dbConfig.host,
      user: dbConfig.insert.user,
      password: dbConfig.insert.password,
      database: dbConfig.database,
    });

    this.readonlyDB = new Database({
      host: dbConfig.host,
      user: dbConfig.readonly.user,
      password: dbConfig.readonly.password,
      database: dbConfig.database,
    });
  }

  async start() {
    try {
      console.log("Starting API server...");
      await this.insertDB.ensureTableExists();

      const server = http.createServer(this.handleRequest.bind(this));
      server.listen(this.port, () => {
        console.log(`API server running on port ${this.port}`);
      });
    } catch (err) {
      console.error("API server failed to start:", err);
    }
  }

  async handleRequest(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const parsedUrl = url.parse(req.url, true);
    const { pathname } = parsedUrl;

    if ((req.method === "POST" || req.method === "GET") && pathname === "/lab5/api/v1/insert") {
      await this.handleInsert(res);
      return;
    }

    if (req.method === "GET" && (pathname === "/lab5/api/v1/sql" || pathname.startsWith("/lab5/api/v1/sql/"))) {
      await this.handleSelect(parsedUrl, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }

  async handleInsert(res) {
    try {
      await this.insertDB.ensureTableExists();
      await this.insertDB.insertDefaultPatients();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Patients inserted successfully" }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  extractQuery(parsedUrl) {
    if (parsedUrl.query.q) {
      return parsedUrl.query.q;
    }

    const prefix = "/lab5/api/v1/sql/";
    if (parsedUrl.pathname.startsWith(prefix)) {
      const encoded = parsedUrl.pathname.slice(prefix.length);
      if (encoded.length > 0) {
        return decodeURIComponent(encoded);
      }
    }

    return "";
  }

  async handleSelect(parsedUrl, res) {
    const query = this.extractQuery(parsedUrl);

    if (!query || !query.trim().toLowerCase().startsWith("select")) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Only SELECT statements are allowed");
      return;
    }

    try {
      const result = await this.readonlyDB.runSelectQuery(query);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  }
}

const port = Number.parseInt(process.env.PORT, 10) || 3001;
const server = new ApiServer(port);
server.start();
