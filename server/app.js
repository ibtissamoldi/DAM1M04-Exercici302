const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const exphbs = require('express-handlebars');
const MySQL = require('./utilsMySQL');

const app = express();
const PORT = process.env.DEFAULT_SERVER_PORT || 3000;

// Llegir dades comunes (common.json)
const common = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/common.json'))
);

// Detectar Proxmox
const isProxmox = !!process.env.PM2_HOME;

// Connexió MySQL
const db = new MySQL();

if (!isProxmox) {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'sakila'
  });
} else {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'super',
    password: '1234',
    database: 'sakila'
  });
}

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

// Ruta principal
app.get('/', async (req, res) => {
  try {
    const moviesRows = await db.query(`
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

    const categoriesRows = await db.query(`
      SELECT category_id, name
      FROM category
      ORDER BY category_id
      LIMIT 5
    `);

    const movies = db.table_to_json(moviesRows, {
      film_id: 'number',
      title: 'string',
      release_year: 'number',
      actors: 'string'
    });

    const categories = db.table_to_json(categoriesRows, {
      category_id: 'number',
      name: 'string'
    });

    res.render('index', {
      ...common,
      movies,
      categories
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// ruta movies

app.get('/movies', async (req, res) => {
  try {
    const filmsRows = await db.query(`
      SELECT 
        f.film_id,
        f.title,
        f.release_year,
        f.rating,
        f.description,
        GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') AS actors
      FROM film f
      JOIN film_actor fa ON f.film_id = fa.film_id
      JOIN actor a ON fa.actor_id = a.actor_id
      GROUP BY f.film_id
      ORDER BY f.film_id
      LIMIT 15
    `);

    const films = db.table_to_json(filmsRows, {
      film_id: 'number',
      title: 'string',
      release_year: 'number',
      rating: 'string',
      description: 'string',
      actors: 'string'
    });

    res.render('movies', {
      ...common,
      films
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// ruta customers

app.get('/customers', async (req, res) => {
  try {

    const clientsRows = await db.query(`
      SELECT customer_id, first_name, last_name, email
      FROM customer
      ORDER BY customer_id
      LIMIT 25
    `);

    const clients = db.table_to_json(clientsRows, {
      customer_id: 'number',
      first_name: 'string',
      last_name: 'string',
      email: 'string'
    });

    for (let client of clients) {
      const rentalsRows = await db.query(`
        SELECT f.title, r.rental_date
        FROM rental r
        JOIN inventory i ON r.inventory_id = i.inventory_id
        JOIN film f ON i.film_id = f.film_id
        WHERE r.customer_id = ${client.customer_id}
        ORDER BY r.rental_date
        LIMIT 5
      `);

      client.rentals = db.table_to_json(rentalsRows, {
        title: 'string',
        rental_date: 'datetime'
      });
    }

    res.render('customers', {
      ...common,
      clients
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

//Servidor
app.listen(PORT, () => {
  console.log(`Servidor actiu a http://localhost:${PORT}`);
});

// Tancar MySQL correctament al tancar el proces
process.on('SIGINT', async () => {
  console.log('\nTancant connexió MySQL...');
  await db.end();
  process.exit();
});