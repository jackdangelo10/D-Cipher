require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const favicon = require('serve-favicon');

// Serve the favicon
app.use(favicon(path.join(__dirname, 'favicon.ico')));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'views')));
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/passwords', passwordRoutes);



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});