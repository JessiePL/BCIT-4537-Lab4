import http from "http";
import url from "url";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "../Database/Database.js";
import { STRING } from "../lang/messages/en/ServerMessages.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const configPath = path.join(currentDirPath, "db.config.json");
let dbConfig;
try {
  dbConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
  console.error(STRING.FAILED_TO_LOAD_DB_CONFIG, err.message);
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
      console.log(STRING.STARTING_API_SERVER);
      await this.insertDB.ensureTableExists();

      const server = http.createServer(this.handleRequest.bind(this));
      server.listen(this.port, () => {
        console.log(`${STRING.API_SERVER_RUNNING_PREFIX} ${this.port}`);
      });
    } catch (err) {
      console.error(STRING.API_SERVER_FAILED_TO_START_PREFIX, err);
    }
  }

  async handleRequest(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const parsedUrl = url.parse(req.url, true);
    const { pathname } = parsedUrl;

    if (req.method === "POST" && pathname === "/lab5/api/v1/insert") {
      await this.handleInsert(res);
      return;
    }

    if (req.method === "GET" && (pathname === "/lab5/api/v1/sql" || pathname.startsWith("/lab5/api/v1/sql/"))) {
      await this.handleSelect(parsedUrl, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(STRING.NOT_FOUND);
  }

  async handleInsert(res) {
    try {
      await this.insertDB.ensureTableExists();
      await this.insertDB.insertDefaultPatients();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: STRING.PATIENTS_INSERTED_SUCCESSFULLY }));
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
      res.end(STRING.ONLY_SELECT_ALLOWED);
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
