import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//express app
const app = express();

//view engine set up
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

//parse data for POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//database connection info
const conn = mysql.createPool({
    host: 'e764qqay0xlsc4cz.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user: 'se74fp7hnsab7j9i',
    password: 'z3qo9z877u97kpdc',
    database: 'zmyzjet8o95l8dus'
});

//default home
app.get('/', (req, res) => {
    res.render('index');
});

//new author load
app.get('/author/new', (req, res) => {
    res.render('newAuthor');
});

//new author post
app.post('/author/new', async (req, res) => {
    try {
        //store input
        const fName = req.body.fName;
        const lName = req.body.lName;
        const birthDate = req.body.birthDate;

        //sql insert query
        const sql = `
        INSERT INTO q_authors
            (firstName, lastName, dob)
        VALUES (?, ?, ?)
        `;

        //param array
        const params = [fName, lName, birthDate];

        //submit sql query passing the variables
        await conn.query(sql, params);

        //reload the page with an updated message
        res.render('newAuthor', { message: 'Author added!' });
    } catch (err) {
        console.error(err);
        //error
        res.render('newAuthor', { message: 'Error adding author.' });
    }
});

//new quote load
app.get('/quote/new', async (req, res) => {
    try {
        //sql get authors for dropdown
        const [authors] = await conn.query(`
            select authorId, firstName, lastName
            from q_authors
            order by lastName, firstName
        `);

        //sql get distinct categories from current quotes
        const [categories] = await conn.query(`
            select distinct category
            from q_quotes
            where category is not null and category <> ''
            order by category
        `);

        //render the page and pass in the returned sql data
        res.render('newQuote', {
            authors,
            categories,
            message: undefined
        });
    } catch (err) {
        //error
        console.error(err);
        res.status(500).send('error loading new quote form');
    }
});

//new quote post
app.post('/quote/new', async (req, res) => {
    try {
        //store input
        const quote = req.body.quote;
        const authorId = req.body.authorId;
        const category = req.body.category || null;  // can be null/empty

        //sql insert query
        const sql = `
        INSERT INTO q_quotes
            (quote, authorId, category)
        VALUES (?, ?, ?)
        `;

        //param array
        const params = [quote, authorId, category];

        //submit sql query passing the variables
        await conn.query(sql, params);

        //sql get authors from current table
        const [authors] = await conn.query(`
            select authorId, firstName, lastName
            from q_authors
            order by lastName, firstName
        `);

        //sql get categories from current table
        const [categories] = await conn.query(`
            select distinct category
            from q_quotes
            where category is not null and category <> ''
            order by category
        `);

        //render the page and pass in the returned sql data
        res.render('newQuote', {
            authors,
            categories,
            message: 'Quote added!'
        });
    } catch (err) {
        //err
        console.error(err);

        //still need authors and categories to render the form
        const [authors] = await conn.query(`
            select authorId, firstName, lastName
            from q_authors
            order by lastName, firstName
        `);

        const [categories] = await conn.query(`
            select distinct category
            from q_quotes
            where category is not null and category <> ''
            order by category
        `);

        res.render('newQuote', {
            authors,
            categories,
            message: 'Error adding quote.'
        });
    }
});

//list authors
app.get('/authors', async (req, res) => {
    //sql query
    try {
        const sql = `
            SELECT *
            FROM q_authors
            ORDER BY lastName
        `;

        //save returned data
        const [rows] = await conn.query(sql);

        //render page using returned data from table
        res.render('authorList', { authors: rows });
    } catch (err) {
        //err
        console.error(err);
        res.status(500).send('Error retrieving authors.');
    }
});

//load edit author page
app.get('/author/edit', async (req, res) => {
    //get sql data
    try {
        const authorId = req.query.authorId;

        const sql = `
            SELECT *,
                DATE_FORMAT(dob, '%Y-%m-%d') AS dobISO
            FROM q_authors
            WHERE authorId = ?
        `;

        //dave returned data
        const [rows] = await conn.query(sql, [authorId]);

        //render page using returned data from table
        res.render('editAuthor', { authorInfo: rows });
    } catch (err) {
        //err
        console.error(err);
        res.status(500).send('Error loading author.');
    }
});

//edit author post
app.post('/author/edit', async (req, res) => {
    try {
        //sql query
        const sql = `
            UPDATE q_authors
            SET firstName = ?,
                lastName = ?,
                dob = ?,
                sex = ?
            WHERE authorId = ?
        `;

        //store input
        const params = [
            req.body.fName,
            req.body.lName,
            req.body.dob,
            req.body.sex,
            req.body.authorId
        ];

        //query passing into input
        await conn.query(sql, params);

        //return to author page
        res.redirect('/authors');
    } catch (err) {
        //err
        console.error(err);
        res.status(500).send('Error updating author.');
    }
});

//delete author
app.get('/author/delete', async (req, res) => {
    try {
        //get input
        const authorId = req.query.authorId;

        //sql query
        const sql = `
            DELETE FROM q_authors
            WHERE authorId = ?
        `;

        //run query pass in input
        await conn.query(sql, [authorId]);

        //after deleting return to authors
        res.redirect('/authors');
    } catch (err) {
        //err
        console.error(err);
        res.status(500).send('Error deleting author.');
    }
});

//list quotes
app.get('/quotes', async (req, res) => {
    try {
        //sql query
        const sql = `
            select 
                q.quoteId,
                q.quote,
                q.category,
                a.authorId,
                a.firstName,
                a.lastName
            from q_quotes q
                join q_authors a on q.authorId = a.authorId
            order by a.lastName, a.firstName, q.quoteId
        `;

        //store returned data
        const [rows] = await conn.query(sql);

        //load page using data
        res.render('quoteList', { quotes: rows });
    } catch (err) {
        //err
        console.error(err);
        res.status(500).send('error retrieving quotes.');
    }
});

//load edit quote
app.get('/quote/edit', async (req, res) => {
    try {
        //get input
        const quoteId = req.query.quoteId;

        //load quote being edited
        const [quoteRows] = await conn.query(
            `select * from q_quotes where quoteId = ?`,
            [quoteId]
        );

        //load authors for dropdown
        const [authors] = await conn.query(`
            select authorId, firstName, lastName
            from q_authors
            order by lastName, firstName
        `);

        //load distinct categories for dropdown
        const [categories] = await conn.query(`
            select distinct category
            from q_quotes
            where category is not null and category <> ''
            order by category
        `);

        //render site with data
        res.render('editQuote', {
            quote: quoteRows[0],
            authors,
            categories
        });

    } catch (err) {
        //err
        console.error(err);
        res.status(500).send('error loading quote for editing.');
    }
});

//edit quote post
app.post('/quote/edit', async (req, res) => {
    try {
        //sql query
        const sql = `
            update q_quotes
            set quote = ?,
                authorId = ?,
                category = ?
            where quoteId = ?
        `;

        //get input
        const params = [
            req.body.quote,
            req.body.authorId,
            req.body.category || null,
            req.body.quoteId
        ];

        //run query using input
        await conn.query(sql, params);

        //return to quotes page
        res.redirect('/quotes');

    } catch (err) {
        console.error(err);
        res.status(500).send('error updating quote.');
    }
});

//delete quote
app.get('/quote/delete', async (req, res) => {
    try {
        //get input
        const quoteId = req.query.quoteId;

        //sql query
        const sql = `
            delete from q_quotes
            where quoteId = ?
        `;

        //run query with input
        await conn.query(sql, [quoteId]);

        //after deleting return to quotes
        res.redirect('/quotes');
    } catch (err) {
        console.error(err);
        res.status(500).send('error deleting quote.');
    }
});

//server start
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

export { conn };