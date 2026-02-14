class Server1Client {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.STRING = STRING;
    this.output = document.getElementById("output");
    this.insertBtn = document.getElementById("insertBtn");
    this.selectBtn = document.getElementById("selectBtn");
    this.queryInput = document.getElementById("queryInput");
  }

  init() {
    this.insertBtn.addEventListener("click", this.postInsert.bind(this));
    this.selectBtn.addEventListener("click", this.runSelect.bind(this));
  }

  setOutput(value) {
    this.output.textContent = value;
  }

  formatMessage(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, key) => `${values[key] ?? ""}`);
  }

  async postInsert() {
    this.insertBtn.disabled = true;
    this.setOutput(this.STRING.SENDING_POST_INSERT);

    try {
      const res = await fetch(`${this.apiBase}/insert`, {
        method: "POST",
      });
      const body = await res.text();
      if (res.ok) {
        this.setOutput(this.STRING.INSERT_SENT_SUCCESS);
      } else {
        this.setOutput(body);
      }
    } catch (err) {
      this.setOutput(this.formatMessage(this.STRING.REQUEST_FAILED_TEMPLATE, { message: err.message }));
    } finally {
      this.insertBtn.disabled = false;
    }
  }

  async runSelect() {
    const query = this.queryInput.value.trim();
    if (!query) {
      this.setOutput(this.STRING.EMPTY_SELECT_QUERY);
      return;
    }
    if (!query.toLowerCase().startsWith("select")) {
      this.setOutput(this.STRING.ONLY_SELECT_ALLOWED);
      return;
    }

    this.selectBtn.disabled = true;
    this.setOutput(this.STRING.SENDING_GET_SQL);

    try {
      const url = `${this.apiBase}/sql?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { method: "GET" });
      const body = await res.text();
      this.setOutput(body);
    } catch (err) {
      this.setOutput(this.formatMessage(this.STRING.REQUEST_FAILED_TEMPLATE, { message: err.message }));
    } finally {
      this.selectBtn.disabled = false;
    }
  }
}

const app = new Server1Client("http://localhost:3001/lab5/api/v1");
app.init();
