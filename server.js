const multer = require('multer');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const notifier = require('node-notifier');

const express = require('express');
const server = express();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // CRUD operationer kan göras här direkt
}
  
main()
    .then(async () => {
      await prisma.$disconnect()
})
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
})

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Session
server.use(session({
    secret: 'authenticationgivesmeheadache',
    resave: false,
    saveUninitialized: true
}));

server.use(express.urlencoded({ extended: true }));

// Routes
server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
  
// PUBLICERA
server.get('/create_post', (req, res) => {
    if (req.session && req.session.user && req.session.user.role == "admin") {
        res.send(` 
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="../css/style.css">
        </head>
        <form action="/create_posts" method="post" enctype="multipart/form-data">
            <label for="title">Titel: </label>
            <input type="text" name="title" id="title" required>

            <label for="description">Beskrivning: </label>
            <textarea type="text" id="description" name="description" rows="10" cols="50"></textarea>

            <label for="image">Bild: </label>
            <input type="file" accept="image/png, image/jpeg" name="image" id="image">

            <input type="submit" name="publish" value="Publicera">
        </form>
    `);
    } else {
        console.log('User not in session');
    }

});
  
// SE
server.get('/view_post', async (req, res) => {
    
    if (req.session && req.session.user) {
        const posts = await prisma.post.findMany();

        let postHTML = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>View Posts</title>
            <link rel="stylesheet" href="../css/view_post.css">
        </head>
        <body>
            <div id="post-list">`;

        posts.forEach(post => {
            postHTML += `<div class="post">
                <h2>${post.title}</h2>
                <img src="/uploads/${post.image}" alt="Blogg-bild" width="100" height="100">
                <p>${post.content}</p>
            </div>`;
        });

        postHTML += `</div>
        </body>
        </html>`;

        res.send(postHTML);
    } else {
        console.log('User not in session');
    }
});
  
server.get('/registration', (req, res) => {
    res.sendFile(path.join(__dirname, 'registration.html'));
});

server.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

server.listen(3000, () => {
    console.log('Server is listening on http://localhost:3000');
});

// SKAPA
server.post('/registration', async (req, res) => {
    console.log(req.body);

    const { username, password, role } = req.body;

    try {
        const register = await prisma.user.create({
            data: {
                username: username,
                password: password,
                role: role,
            },
        })

        notifier.notify({
            title: 'Konto skapad!',
            message: 'Bra jobbat',
            icon: path.join(__dirname, '/img/check.jpg')
        });

        res.redirect('/index.html');

    } catch (error) {
        console.error('Error (skapa):', error);
        notifier.notify({
            title: 'Något gick fel',
            message: `Testa igen`,
            icon: path.join(__dirname, '/img/cross.png')
        });
    }
})

// LOGIN
server.post('/login', async (req, res) => {
    const { username, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: username,
        password: password
      },
    });


    if (!user || user.password !== password) {
        notifier.notify({
            title: 'Fel inmatning',
            message: `Testa igen`,
            icon: path.join(__dirname, '/img/cross.png')
        });
      return;
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      loggedin: true
    };


    // Roll vilkor
    if (user.role == "user") {
            res.send(` 
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>View Posts</title>
                <link rel="stylesheet" href="../css/login.css">
            </head>
            <a href="view_post">Se Blogginlägg</a>

            <form action="/logout" method="get">
                <input type="submit" name="logout" value="Logga ut">
            </form>
        `);
        notifier.notify({
            title: 'Inloggad som användare!',
            message: `Välkommen ${username}`,
            icon: path.join(__dirname, '/img/check.jpg')
        });
    }
    
    if (user.role == "admin") {
        res.send(` 
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>View Posts</title>
                <link rel="stylesheet" href="../css/login.css">
            </head>
            <a href="create_post">Skapa Blogginlägg</a>
            <a href="view_post">Se Blogginlägg</a>

            <form action="/logout" method="get">
                <input type="submit" name="logout" value="Logga ut">
            </form>
        `);
        notifier.notify({
            title: 'Inloggad som admin!',
            message: `Välkommen ${username}`,
            icon: path.join(__dirname, '/img/check.jpg')
        });

        console.log('Logged in user:', req.session.user);
    }


  } catch (error) {
    console.error('Error (login):', error);
    notifier.notify({
        title: 'Server fel',
        message: 'Testa igen',
        icon: path.join(__dirname, '/img/cross.png')
    });
  }
})

// LOGOUT
server.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/index.html');
    notifier.notify({
        title: 'Utloggad!',
        message: 'Hejdå',
        icon: path.join(__dirname, '/img/check.jpg')
    });
});

// PUBLICERA
server.post('/create_posts', upload.single('image'), async (req, res) => {
    const { title, description } = req.body;

    try {
        const post = await prisma.post.create({
            data: {
                title: title,
                content: description,
                image: req.file ? req.file.filename : ''
            },
        })
        
        notifier.notify({
            title: 'Blogginlägg publicerad!',
            message: 'Bra jobbat',
            icon: path.join(__dirname, '/img/check.jpg')
        });
    
        res.redirect('/index.html');

    } catch (error) {
        console.error('Error (login):', error);
        notifier.notify({
            title: 'Server fel',
            message: 'Testa igen',
            icon: path.join(__dirname, '/img/cross.png')
        });
    }
})

server.use(express.static('.'));