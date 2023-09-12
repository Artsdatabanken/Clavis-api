const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

// --- Reading env variables
dotenv.config({ path: "./config/config.env" });
dotenv.config({ path: "./config/secrets.env" });

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Timeframe
  max: 500, // Max requests per timeframe per ip
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (request, response, next, options) => {
    writeErrorLog(
      `Too many misc API requests`,
      `IP ${request.client._peername.address}`
    );
    return response.status(options.statusCode).send(options.message);
  },
});

// --- Getting the date as a nice Norwegian-time string no matter where the server runs
const dateStr = (resolution = `d`, date = false) => {
  if (!date) {
    date = new Date();
  }

  let iso = date
    .toLocaleString("en-CA", { timeZone: "Europe/Oslo", hour12: false })
    .replace(", ", "T");
  iso = iso.replace("T24", "T00");
  iso += "." + date.getMilliseconds().toString().padStart(3, "0");
  const lie = new Date(iso + "Z");
  const offset = -(lie - date) / 60 / 1000;

  if (resolution === `m`) {
    return `${new Date(date.getTime() - offset * 60 * 1000)
      .toISOString()
      .substring(0, 7)}`;
  } else if (resolution === `s`) {
    return `${new Date(date.getTime() - offset * 60 * 1000)
      .toISOString()
      .substring(0, 19)
      .replace("T", " ")}`;
  }

  return `${new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .substring(0, 10)}`;
};

const app = express();
const port = process.env.PORT;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));

app.use(function (req, res, next) {
  if (req.secure) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=1; includeSubDomains; preload"
    );
  }
  next();
});

app.get("/", apiLimiter, (req, res) => {
  let v = "Gitless";
  const gitfile = ".git/FETCH_HEAD";
  if (fs.existsSync(gitfile)) {
    v = fs.readFileSync(gitfile).toString().split("\t")[0];
  }

  fs.stat("./server.js", function (err, stats) {
    res.status(200).send(`${v}<br/>${dateStr("s", stats.mtime)}`);
  });
});

app.get("/key/*", apiLimiter, (req, res) => {
  let keyid = req.originalUrl.replace("/key/", "");

  const keyfile = `./keys/${decodeURI(keyid)}.json`;
  if (fs.existsSync(file)) {
    keyjson = JSON.parse(fs.readFileSync(keyfile));
    res.status(200).json(keyjson);
  } else {
    res.status(404).end();
  }
});

// --- Path that Azure uses to check health, prevents 404 in the logs
app.get("/robots933456.txt", apiLimiter, (req, res) => {
  res.status(200).send("Hi, Azure");
});

// --- Serve a favicon, prevents 404 in the logs
app.use("/favicon.ico", apiLimiter, express.static("favicon.ico"));

app.listen(port, console.log(`Server now running on port ${port}`));
