import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  designation: { type: String, required: true },
  password: { type: String, required: true },
  isAdmin :{type : Boolean,required : true}
});

export default mongoose.model("User", userSchema);
