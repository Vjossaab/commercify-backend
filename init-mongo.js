// Initialize MongoDB replica set
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb:27017" }
  ]
});

// Create database and collections
db = db.getSiblingDB('commercify');

// Create users collection with indexes
db.users.createIndex({ "email": 1 }, { unique: true });

// Create products collection with indexes
db.products.createIndex({ "sellerId": 1 });
db.products.createIndex({ "category": 1 });
db.products.createIndex({ "created_at": 1 });

// Create orders collection with indexes
db.orders.createIndex({ "userId": 1 });
db.orders.createIndex({ "created_at": 1 });
db.orders.createIndex({ "userId": 1, "created_at": -1 });

print("MongoDB initialized successfully for Commercify");