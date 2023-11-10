// Required dependencies/modules
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;
const path = require("path");

// Middleware to allow cross-origin requests (CORS)
app.use(cors());

// Set up the public directory to serve static files
let publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

let fetch;  // Will be assigned the fetch function from node-fetch module

const API_KEY = 'a0e244afaa38e8be61d3c068ceb49c87';  // API key for OpenWeatherMap

// Function to initialize and start the server
async function startServer() {
    const fetchModule = await import('node-fetch');  // Dynamically importing node-fetch
    fetch = fetchModule.default;

    // Setting up the route for fetching weather/pollution and humidity forecast based on a city
    app.get('/forecast/:city', findWeather);

    // Setting up the route for fetching city suggestions based on a query
    app.get('/city-suggestions/:query', getCitySuggestions);

    // Starting the Express server on the specified port
    app.listen(port, () => console.log(`Example app listening on port ${port}!`));
}

// Function to fetch weather data based on the city name
async function findWeather(req, res) {
    try {
        let city = req.params.city;
        const coords = await getCoordinates(city);  // Fetching coordinates for the city

        if (coords.lat && coords.lon) {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${API_KEY}`;
            const weatherResponse = await fetch(weatherUrl);
            const weatherData = await weatherResponse.json();

            // Fetching air pollution data
            const airPollutionData = await getAirPollution(coords.lat, coords.lon);

            // Extracting humidity levels from the weather data
            const humidityLevels = weatherData.list.map(entry => entry.main.humidity);

            // Logging the fetched data
            console.log("Weather Data for city:", city, weatherData);
            console.log("Air Pollution Data for city:", city, airPollutionData)

            // Sending the fetched data as the response
            res.send({
                weather: weatherData,
                airPollution: airPollutionData,
                humidity: humidityLevels
            });
        } else {
            throw new Error("Location not found");
        }
    } catch (error) {
        console.error("Error fetching data for city:", req.params.city, error.message);
        return res.status(500).send('Failed to fetch data.');
    }
}

// Function to fetch coordinates (latitude and longitude) for a city name
async function getCoordinates(city) {
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
    const response = await fetch(geoUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch coordinates for city: ${city}. HTTP Status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
        return {
            lat: data[0].lat,
            lon: data[0].lon
        };
    } else {
        throw new Error(`Could not get coordinates for the given city: ${city}`);
    }
}

// Function to fetch air pollution data based on latitude and longitude
async function getAirPollution(lat, lon) {
    const airPollutionUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    const response = await fetch(airPollutionUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch air pollution data for lat: ${lat}, lon: ${lon}. HTTP Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

// Function to fetch city name suggestions based on a query string
async function getCitySuggestions(req, res) {
    try {
        const query = encodeURIComponent(req.params.query);  // Encoding the query string
        const suggestionUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=1&appid=${API_KEY}`; // fetch the top 5 matches
        const response = await fetch(suggestionUrl);
        const data = await response.json();

        const suggestions = data.map(item => item.name);  // Extracting city names from the fetched data
        res.send(suggestions);
    } catch (error) {
        console.error("Error fetching city suggestions:", decodeURIComponent(query), error.message);
        return res.status(500).send([]);
    }
}

startServer();  // Initiating the startServer function
