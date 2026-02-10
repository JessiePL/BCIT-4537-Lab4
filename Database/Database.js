import mysql from "mysql2/promise";

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
    const patients = [
      ["Sara Brown", "1901-01-01"],
      ["John Smith", "1941-01-01"],
      ["Jack Ma", "1961-01-30"],
      ["Elon Musk", "1999-01-01"],
    ];

    const sql = "INSERT INTO patient (name, dateOfBirth) VALUES ?";
    await this.pool.query(sql, [patients]);
  }

  async runSelectQuery(query) {
    const [rows] = await this.pool.query(query);
    return rows;
  }
}
