const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Admin/.gemini/antigravity/scratch/open-theatre-ott/backend/.env' });

const movieSchema = new mongoose.Schema({
  title: String,
  slug: String
}, { strict: false });
const Movie = mongoose.model('Movie', movieSchema);

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  const movies = await Movie.find({ slug: { $exists: false } });
  console.log(`Found ${movies.length} movies without slugs.`);
  
  for (const movie of movies) {
    if (movie.title) {
      movie.slug = generateSlug(movie.title);
      await movie.save();
      console.log(`Generated slug: ${movie.slug} for ${movie.title}`);
    }
  }
  
  console.log('Migration complete.');
  process.exit();
}).catch(e => {
  console.error(e);
  process.exit(1);
});
