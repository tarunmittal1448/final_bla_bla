import Ride from "../models/Ride.js"
import User from "../models/User.js"; 

export const getRide = async (req, res, next) => {
  try{
    const ride = await Ride.findById(req.params.id).populate('creator', 'name age stars rating profile ridesCreated createdAt').lean(); 
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    res.status(200).json(ride); 
  }catch(err){
    next(err);
  }
}

export const getAllRides = async (req, res, next) => {
  try{
    const rides = await Ride.find().populate('creator', 'name stars').lean(); 
    res.status(200).json(rides); 
  }catch(err){
    next(err);
  }
}

export const findRides = async (req, res, next) => {
  try {
    const { from, to, seat, date } = req.query;
    
    if (!from || !to || !seat || !date) {
        return res.status(400).json({ message: 'Please provide all the details' });
    }
    const searchDate = new Date(date)
    searchDate.setHours(0, 0, 0, 0); // Set to midnight of the specified date

    const rides = await Ride.find({
        'origin.place': new RegExp(from, 'i'),
        'destination.place': new RegExp(to, 'i'),
        'availableSeats': { $gte: seat},
        'startTime': { $gte: searchDate.toISOString(), $lt: new Date(searchDate.getTime() + 24 * 60 * 60 * 1000).toISOString() } // Filter rides up to next midnight
    })
    .populate('creator', 'name profilePicture stars') 
    .lean(); 
    res.status(200).json({ success: true, rides });
  } catch (err) {
    next(err);
  }
}

export const joinRide = async (req, res, next) => {
  try {
    // Check if req.user is populated and contains user information
    if (!req.user) {
      return res.status(401).json({ message: 'You are not authenticated!' });
    }

    // Fetch the ride based on the provided ID
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      // If ride doesn't exist, return an error
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.passengers.includes(req.user.id)) {
      // If user has already joined the ride, return a conflict error
      return res.status(409).json({ message: 'You already joined this ride!' });
    }

    if (ride.passengers.length >= ride.availableSeats) {
      // If ride is full, return a forbidden error
      return res.status(403).json({ message: 'Ride is full!' });
    }

    // Update ride passengers and availableSeats
    await Ride.updateOne(
      { _id: ride._id },
      { $push: { passengers: req.user.id }, $inc: { availableSeats: -1 } }
    );

    // Update user's ridesJoined
    await User.updateOne(
      { _id: req.user.id },
      { $push: { ridesJoined: ride._id } }
    );

    // Return success message
    res.status(200).json({ message: 'Successfully joined the ride!' });
  } catch (err) {
    // Handle any errors
    next(err); // Pass the error to the error handling middleware
  }
};


export const createRide = async (req, res, next) =>{
  try{
    const newRide = new Ride({...req.body, creator: req.user.id});
    await newRide.save()
    await User.findByIdAndUpdate(req.user.id, { $push: { ridesCreated: newRide._id } });
    res.status(201).json(newRide)
  }catch(err){
    next(err);
  }
}

export const updateRide = async(req, res, next) => {
  try{
    const { ...details } = req.body;
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      {
        $set: details,
      },
      {new:true}    
    )
    res.status(200).json({success: true, ride})
  }catch(err){
    next(err)
  }
}

export const deleteRide = async(req, res, next) => {
  try{
    await Ride.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate( req.user.id, { $pull: { ridesCreated: req.params.id } })
    res.status(200).send("ride has been deleted");
  }catch(err){
    next(err)
  }
}