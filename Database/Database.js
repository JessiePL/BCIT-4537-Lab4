import mysql from "mysql2/promise";
import fs from "fs";

export default class Database {
  constructor(config) {
    this.config = config;
    this.pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async ensureTableExists() {
    const sql = `
      CREATE TABLE IF NOT EXISTS patient (
        patientid INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        dateOfBirth DATETIME
      ) ENGINE=InnoDB
    `;
    await this.pool.query(sql);
  }

  async seedPatientsIfNeeded() {
    const [rows] = await this.pool.query("SELECT COUNT(*) AS count FROM patient");
    const count = rows?.[0]?.count ?? 0;
    if (count === 0) {
      await this.insertDefaultPatients();
    }
  }

  async insertDefaultPatients() {
    const dataPath = new URL("../lang/messages/en/PatientInformation.json", import.meta.url);
    const raw = fs.readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(raw);
    await this.insertPatients(parsed.patients || []);
  }

  async insertPatients(patientsInput) {
    if (!Array.isArray(patientsInput) || patientsInput.length === 0) {
      throw new Error("No patient data provided");
    }

    const patients = patientsInput.map((item) => {
      if (!item || typeof item.name !== "string" || typeof item.dateOfBirth !== "string") {
        throw new Error("Invalid patient payload");
      }
      return [item.name, item.dateOfBirth];
    });

    const sql = "INSERT INTO patient (name, dateOfBirth) VALUES ?";
    await this.pool.query(sql, [patients]);
  }

  async runSelectQuery(query) {
    const [rows] = await this.pool.query(query);
    return rows;
  }
}
