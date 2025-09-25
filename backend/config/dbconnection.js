//db connection
import mongoose from "mongoose";

const dbconnection = async()=>{
   await mongoose.connect("mongodb+srv://keyhasith800:ZFe1o5l7X4eVn4AP@cluster0.ao4qp8f.mongodb.net/ITP?retryWrites=true&w=majority&appName=Cluster0");
   console.log("DATABASE CONNECTION SUCCESSFULLY!")
}



export default dbconnection;