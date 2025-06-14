require('dotenv').config()
const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const coffeeCollection = client.db('coffeeDB').collection('coffee')
    const orders = client.db('coffeeDB').collection('orders')

    app.get('/coffees', async (req, res) => {
      const allCoffee = req.body
      const result = await coffeeCollection.find(allCoffee).toArray()
      res.send(result)
    })

    app.get('/coffees/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await coffeeCollection.findOne(query)
      res.send(result)
    })

    app.patch('/like/:coffeeId', async(req, res) =>{
      const id = req.params.coffeeId
      const email = req.body.email
      const filter = { _id: new ObjectId(id) }
      const coffee = await coffeeCollection.findOne(filter)
      // chech if the user has already liked the coffee or not 
      const alreadyLiked = coffee?.likedBy.includes(email)
      // console initial
      // console.log('console initial', alreadyLiked);

      const updatedDoc = alreadyLiked ? {
        $pull: {
          likedBy: email
        }
      } : {
        $addToSet: {
          likedBy: email
        }
      }

      // console after
      // console.log('console after', !alreadyLiked);

      await coffeeCollection.updateOne(filter, updatedDoc)
      res.send({message: alreadyLiked? "dislike successfull":"like successfull", 
      liked: !alreadyLiked })

    })

    app.get('/mycoffees/:email', async (req, res) => {
      const email = req.params.email
      const query = { email }
      const result = await coffeeCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/coffees', async (req, res) => {
      const newProduct = req.body
      const quantity = newProduct.quantity
      newProduct.quantity = parseInt(quantity)
      const result = await coffeeCollection.insertOne(newProduct)
      res.send(result)
    })

    app.get('/myorders/:email', async(req,res)=>{
       const email = req.params.email
       const filter = { customerEmail: email }
       const myorders = await orders.find(filter).toArray()

       for(const order of myorders){
           const id = order.coffeeId
           const filter = { _id: new ObjectId(id) }
           const fullCoffeeData = await coffeeCollection.findOne(filter)
           order.name = fullCoffeeData.name
           order.photo = fullCoffeeData.photo
           order.price = fullCoffeeData.price
       }

       res.send(myorders)
    })

    app.post('/orders/:coffeeId', async (req, res) => {
      const id = req.params.coffeeId
      const orderData = req.body
      const result = await orders.insertOne(orderData)

        if(result.acknowledged) {
          // update quantity from coffee collection
          await coffeeCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $inc: {
                quantity: -1
              }
            }
          )
      }
      res.send(result)
    })

    app.delete('/cancelOrder/:id', async(req,res)=>{
        const id = req.params.id
        const query = { _id: new ObjectId(id) }
        const order = await orders.findOne(query);
        const result = await orders.deleteOne(query)

        if(result.acknowledged){
          await coffeeCollection.updateOne(
                { _id: new ObjectId(order.coffeeId) },
             {
              $inc: {
                quantity: +1
              }
            }
          )

        }
        res.send(result)
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('welcome to jwt')
})

app.listen(port, () => {
  console.log('jwt is very diffecult');
})
