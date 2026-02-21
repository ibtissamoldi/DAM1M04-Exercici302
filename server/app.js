require('dotenv').config();
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

// Llegir dades comunes (common.json)
const common = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/common.json'))
);

// Detectar si estem a Proxmox
const isProxmox = process.env.PROXMOX === 'true';

// Connexió MySQL
let pool;

async function initDB() {
  if (!isProxmox) {
    pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'root',
      database: 'sakila'
    });
  } else {
    pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3306,
      user: 'super',
      password: '1234',
      database: 'sakila'
    });
  }
}

initDB();

// Handlebars
app.engine('hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: false,
  partialsDir: path.join(__dirname, 'views/partials')
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Fitx estatics
app.use(express.static(path.join(__dirname, '../public')));

// RUTES:

app.get('/', (req, res) => {
  res.render('index', common);
});

app.get('/movies', (req, res) => {
  res.render('movies', common);
});

app.get('/customers', (req, res) => {
  res.render('customers', common);
});

// servidor
app.listen(PORT, () => {
  console.log(`Servidor actiu a http://localhost:${PORT}`);
});