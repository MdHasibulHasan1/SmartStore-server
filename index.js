const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config();
const app = express()

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.itpj9d6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db('SmartStore').collection('users')
    const productsCollection = client.db('SmartStore').collection('products')
    const cartCollection = client.db('SmartStore').collection('carts')
    const favoriteCollection = client.db('SmartStore').collection('favorites')
    const commentCollection = client.db('SmartStore').collection('comments')

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.send({ token })
    })

    // users related APIs
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'User already exists' });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // products related APIs
    app.post('/products', async (req, res) => {
      const result = await productsCollection.insertOne(req.body);
      res.send(result);
    });
    
    app.get('/products', async (req, res) => {
      const result = await productsCollection.find({}).toArray();
      res.send(result);
    });

    // Route to get new products by date
    app.get('/new/products', async (req, res) => {
      try {
        // Sort products by date in descending order
        const result = await productsCollection.find().sort({ date: -1 }).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    });
    
    // cart collection APIs
    app.get('/carts/:email',  async (req, res) => {
      const email = req.params.email;
      const query = { customerEmail: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    
    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });
    
    app.delete('/deletefromcart/:id',  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    
    // favorites collection APIs
    app.post('/favorites', async (req, res) => {
      const item = req.body;
      const result = await favoriteCollection.insertOne(item);
      res.send(result);
    });

    app.get('/favorites/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await favoriteCollection.find(query).toArray();
      res.send(result);
    });

    // comment  APIs
app.post('/comments/:id/ratings', async (req, res) => {
  const flowerId = req.params.id;
  const newCommentWithRating = req.body.newCommentWithRating;
    // Find the product by ID and push the new comment and rating
const result = await productsCollection.findOneAndUpdate(
      { _id: new ObjectId(flowerId) },
      { $push: { commentsWithRatings: newCommentWithRating } },
      { returnOriginal: false },
    );
    res.send(result);
});
/*  */
// GET route to retrieve commentsWithRatings by product ID
app.get('/products/:id/commentsWithRatings', async(req, res) => {
  const productId = req.params.id;
    // Find the product by ID
    const result = await productsCollection.findOne({ _id: new ObjectId(productId) });
  res.send(result.commentsWithRatings);
});


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!')
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Your server is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
