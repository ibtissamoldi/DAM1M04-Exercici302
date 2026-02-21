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

// Ruta principal
app.get('/', async (req, res) => {
  try {
    // 5 primeres pel·lícules + actors
    const movies = await pool.query(`
      SELECT 
        f.film_id,
        f.title,
        f.release_year,
        GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') AS actors
      FROM film f
      JOIN film_actor fa ON f.film_id = fa.film_id
      JOIN actor a ON fa.actor_id = a.actor_id
      GROUP BY f.film_id
      ORDER BY f.film_id
      LIMIT 5
    `);

    // 5 primeres categories
    const categories = await pool.query(`
      SELECT name
      FROM category
      ORDER BY category_id
      LIMIT 5
    `);

    res.render('index', {
      ...common,
      movies: movies[0],
      categories: categories[0]
    });

  } catch (err) {
    console.error(err);
    res.send('Error base de dades');
  }
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