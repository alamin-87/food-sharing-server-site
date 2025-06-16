const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;
require("dotenv").config();

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin-token.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ Middleware to verify token
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .send({ message: "Unauthorized access: Missing or malformed token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).send({ message: "Unauthorized: Invalid token" });
  }
};

// mongodb connect-------------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.umfqodo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // -----user db
    const userCollection = client
      .db("foodSharing")
      .collection("usersCollection");
    // ----------------
    // ----slider db
    const slide = client.db("foodSharing").collection("slider");
    // --------------
    // ------------foods db
    const foods = client.db("foodSharing").collection("foods");
    // ----------------
    // ------------request food db
    const requestedFoods = client
      .db("foodSharing")
      .collection("requestedFoods");
    // ----------------

    // --------users info-----
    //  --------user get data
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        const result = await userCollection.find().toArray();
        return res.send(result);
      }
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // user post data
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });
    // update user
    app.patch("/users", async (req, res) => {
      const { email, lastSignInTime } = req.body;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          lastSignInTime: lastSignInTime,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    //  ----------------user data end---------------
    // ------------------slider start---------------
    app.get("/slider", async (req, res) => {
      const result = await slide.find().toArray();
      res.send(result);
    });
    // ------------------slider end-----------------
    // ------------------foods data ----------------
    app.get("/foods", async (req, res) => {
      const result = await foods.find().toArray();
      res.send(result);
    });
    // find one item
    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foods.findOne(query);
      res.send(result);
    });
    // ---------------new food
    app.post("/foods", async (req, res) => {
      const food = req.body;
      const result = await foods.insertOne(food);
      res.send(result);
    });
    // update tips data
    app.put("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedFood = req.body;
      const updateDoc = {
        $set: updatedFood,
      };
      const result = await foods.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    // delete food data
    app.delete("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foods.deleteOne(query);
      res.send(result);
    });
    // ------------------foods data end------------
    // GET all requested foods
    app.get("/requestedFoods", async (req, res) => {
      const result = await requestedFoods.find().toArray();
      res.send(result);
    });

    // find one item
    app.get("/requestedFoods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestedFoods.findOne(query);
      res.send(result);
    });
    // POST requested food with same _id as original food
    app.post("/requestedFoods", async (req, res) => {
      const foodData = req.body;

      try {
        // Ensure _id is ObjectId
        foodData._id = new ObjectId(foodData._id);

        // Check if already exists
        const exists = await requestedFoods.findOne({ _id: foodData._id });
        if (exists) {
          return res.status(400).send({ message: "Already requested" });
        }

        const result = await requestedFoods.insertOne(foodData);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ error: "Insert failed", details: error.message });
      }
    });

    // DELETE requested food by same _id
    app.delete("/requestedFoods/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const result = await requestedFoods.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ error: "Delete failed", details: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// -------------------------------------

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
