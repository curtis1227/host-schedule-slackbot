const GoogleSpreadsheet = require('google-spreadsheet');
const queryString = require('query-string');
const creds = require('./client_secret.json');
const doc = new GoogleSpreadsheet('1OT05JLyaLhocbwcZgIWvfI7s_EUPcHTcqF2DdLMeFQo');

const HOSTS_ROW_START = 6;
const HOSTS_ROW_END = 12;
const BREAKFASTS_ROW_START = 14;
const BREAKFASTS_ROW_END = 15;
const POINT_ROW = 17;
const SHADOWS_ROW_START = 19;
const SHADOWS_ROW_END = 20;

function formatServiceBlocks(date, hosts, breakfasts, point, shadows) {
  return [
    {
  		"type": "section",
  		"text": {
  			"type": "mrkdwn",
  			"text": `*${date}*`
  		}
  	},
  	{
  		"type": "divider"
  	},
  	{
  		"type": "section",
  		"fields": [
  			{
  				"type": "mrkdwn",
  				"text": `_*Hosties*_\n${hosts.join('\n')}`
  			},
  			{
  				"type": "mrkdwn",
  				"text": `_*Shadows*_\n${shadows.join('\n')}`
  			},
  			{
  				"type": "mrkdwn",
  				"text": `_*Breakfasters*_\n${breakfasts.join('\n')}`
  			},
  			{
  				"type": "mrkdwn",
  				"text": `_*Point*_\n${point}`
  			}
  		]
  	},
  	{
  		"type": "divider"
  	}
  ];
}

function formatMonthBlocks(services) {
  let blockList = [
  	{
  		"type": "section",
  		"text": {
  			"type": "mrkdwn",
  			"text": ":wave: Here's the schedule for this month!"
  		}
  	}
  ];

  for (let date in services) {
    blockList = blockList.concat(formatServiceBlocks(date, services[date]['hosts'], services[date]['breakfasts'], services[date]['point'], services[date]['shadows']));
  }

  return blockList;
}

exports.handler = function (event, context, callback) {
  // console.log(event);
  const parsedQuery = queryString.parse('?' + event.body);
  // console.log(parsedQuery);

  // Authenticate with the Google Spreadsheets API.
  doc.useServiceAccountAuth(creds, function (err) {
    doc.getCells(1, {
      'min-row': 2,
      'max-row': SHADOWS_ROW_END,
      'min-col': 2,
      'max-col': 9,
      'return-empty': true
    }, function (err, response) {
      let services = {};

      let cells = new Array(SHADOWS_ROW_END + 1);
      for (let i = 0;i < cells.length;i++) {
        cells[i] = new Array(10);
      }

      for (let obj of response) {
        cells[obj['row']][obj['col']] = obj['_value'];
      }

      // console.log(cells);

      for (let col in cells[2]) {
        let date = cells[2][col];

        if (typeof(date) == 'string' && date.match(/^[0-9]+\/[0-9]+$/)) {
          services[date] = { col: col, hosts: [], breakfasts: [], point: '', shadows: [] };
          // Get hosts
          for (let row = HOSTS_ROW_START;row <= HOSTS_ROW_END;row++) {
            if(cells[row][col].length > 0) services[date]['hosts'].push(cells[row][col]);
          }
          // Get breakfasts
          for (let row = BREAKFASTS_ROW_START;row <= BREAKFASTS_ROW_END;row++) {
            if(cells[row][col].length > 0) services[date]['breakfasts'].push(cells[row][col]);
          }
          // Get point
          if(cells[POINT_ROW][col].length > 0) services[date]['point'] = cells[POINT_ROW][col];
          // Get shadows
          for (let row = SHADOWS_ROW_START;row <= SHADOWS_ROW_END;row++) {
            if(cells[row][col].length > 0) services[date]['shadows'].push(cells[row][col]);
          }
        }
      }

      // console.log(services);

      let responseBlocks = null;

      if (parsedQuery['text']) {
        const service = services[parsedQuery['text']];

        responseBlocks = formatServiceBlocks(parsedQuery['text'], service['hosts'], service['breakfasts'], service['point'], service['shadows']);
      } else {
        responseBlocks = formatMonthBlocks(services);
      }

      // console.log(responseText);

      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          "response_type": "in_channel",
          "blocks": responseBlocks
        }),
      });
    });
  });
};
