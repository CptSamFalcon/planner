const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    name: 'Bass Canyon 2026',
    days: ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    dates: ['2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16'],
  });
});

module.exports = router;
