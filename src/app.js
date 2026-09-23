const express = require('express');

const provincesRoutes = require('./routes/provinces.routes');
const districtsRoutes = require('./routes/districts.routes');
const substationsRoutes = require('./routes/substations.routes');
const installationsRoutes = require('./routes/installations.routes');
const readingsRoutes = require('./routes/readings.routes');
const authRoutes = require('./routes/auth.routes');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// TODO (Phase 1): confirm final URI scheme against the resource map
// before wiring these mounts — nesting (e.g. /districts/:id/substations)
// may live inside districtsRoutes rather than as flat top-level mounts.
app.use('/provinces', provincesRoutes);
app.use('/districts', districtsRoutes);
app.use('/substations', substationsRoutes);
app.use('/installations', installationsRoutes);
app.use('/readings', readingsRoutes);
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ service: 'SLSEA Solar Generation API', status: 'ok' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
