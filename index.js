const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.port || 5500
require('dotenv').config()

app.use(cors())
app.use(express.json())
const stripe = require('stripe')(process.env.PAYMENT_SK)


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uw2at.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const userCollection = client.db("chefKing").collection('users')
        const menuCollection = client.db("chefKing").collection('menus')
        const cartCollection = client.db("chefKing").collection('carts')
        const paymentCollection = client.db("chefKing").collection('payments')



        // User Related Api
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })

        app.post('/users/:email', async (req, res) => {

            const email = req.params.email;
            const query = { email }
            const isExist = await userCollection.findOne(query)

            if (isExist) {
                return { isExist }
            }
            const user = req.body;
            const data = {
                ...user,
                role: "user"
            }
            const result = await userCollection.insertOne(data)
            res.send(result)
        })

        // Menus related APIs

        app.get('/menus', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        app.post('/menu', async (req, res) => {
            const menuItem = req.body;
            const result = await menuCollection.insertOne(menuItem)
            res.send(result)
        }

        )

        // Delete Menu
        app.delete('/menus/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = menuCollection.deleteOne(query)
            res.send(result)
        })


        // add to cart
        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem)
            res.send(result)
        })

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })

        // Payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)
            console.log(amount)

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ["card"]
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // Save Payments
        app.post('/payments', async (req, res) => {
            const payment = req.body
            const paymentResult = await paymentCollection.insertOne(payment)

            console.log("payment info", payment)
            // Delete cart items

            const query = {
                _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))
                }
            }
            const deletedResult = await cartCollection.deleteMany(query)

            res.send({ paymentResult, deletedResult })

        })

        // Get Payment Data
        app.get('/payments/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await paymentCollection.find(query).toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('Welcome to KingChef Server')
})

app.listen(port, () => {
    console.log(`app is running at port ${port}`)
})