const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Admin/.gemini/antigravity/scratch/open-theatre-ott/backend/.env' });

const movieSchema = new mongoose.Schema({
  title: String,
  videoLibraryId: String
}, { strict: false });
const Movie = mongoose.model('Movie', movieSchema);

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const movie = await Movie.findById('699eeca5609cb8b9a0df3d39');
  console.log('DB Movie:', movie ? movie.toJSON() : 'Not Found');
  process.exit();
});
