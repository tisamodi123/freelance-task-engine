const mongoose = require('mongoose')

const uri = process.env.MONGODB_URI

const connectDB = async () => {
    if (!uri) {
        console.error("MONGODB_URI is not defined")
        process.exit(1)
    }

    try {
        await mongoose.connect(uri)

        console.log("MongoDB connected");

        mongoose.connection.on('error', (err) => {
            console.error("MongoDB error:", err)
        })

        mongoose.connection.on('disconnected', () => {
            console.warn("MongoDB disconnected")
        })

    } catch (error) {
        console.error("Failed to connect to MongoDB:", error)
        process.exit(1)
    }
}

module.exports = connectDB