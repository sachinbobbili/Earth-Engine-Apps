// Load the FeatureCollection
var indiaDist = ee.FeatureCollection("users/sachinbobbili/India_Dist");

// Get unique state names
var states = indiaDist.aggregate_array('stname').distinct().getInfo();

// Define landcover visualization parameters globally
var landcoverVis = {
  min: 10,
  max: 100,
  palette: [
    '006400', 'ffbb22', 'ffff4c', 'f096ff', 'fa0000', 'b4b4b4',
    'f0f0f0', '0064c8', '0096a0', '00cf75', 'fae6a0', '0a0a0a'
  ],
  names: [
    'Tree Cover', 'Shrubland', 'Grassland', 'Cropland', 'Built-up',
    'Bare / Sparse vegetation', 'Snow and Ice', 'Permanent water bodies',
    'Herbaceous wetland', 'Mangroves', 'Moss and lichen', 'No Data'
  ]
};

// Create UI elements
var stateSelect = ui.Select({
  items: states,
  placeholder: 'Select a state',
  onChange: function(stateName) {
    var districts = indiaDist.filter(ee.Filter.eq('stname', stateName)).aggregate_array('dtname').distinct().getInfo();
    districtSelect.items().reset(districts);
  },
  style: {color: 'blue'}
});

var districtSelect = ui.Select({
  placeholder: 'Select a district',
  onChange: function(districtName) {
    // Clear existing layers
    Map.layers().reset();
    
    // Filter the FeatureCollection for the selected district
    var selectedDistrict = indiaDist.filter(ee.Filter.and(
      ee.Filter.eq('stname', stateSelect.getValue()),
      ee.Filter.eq('dtname', districtName)
    ));
    
    // Display the selected district on the map
    Map.centerObject(selectedDistrict, 8);
    Map.addLayer(selectedDistrict, {}, 'Selected District');
    
    // Display ESA WorldCover 2021 Landcover clipped to the selected district
    var landcover = ee.Image('ESA/WorldCover/v200/2021')
                    .clip(selectedDistrict.geometry());
    
    Map.addLayer(landcover, landcoverVis, 'ESA WorldCover Landcover 2021');
    
    // Calculate area for each land cover class
    var classAreas = landcover.reduceRegion({
      reducer: ee.Reducer.frequencyHistogram(),
      geometry: selectedDistrict.geometry(),
      scale: 10,
      maxPixels: 1e13
    }).get('Map');
    
    // Convert the dictionary to a list of [key, value] pairs.
    classAreas.evaluate(function(result) {
      var areas = [];
      for (var key in result) {
        var area = ee.Number(result[key]).multiply(100).divide(1e6).getInfo(); // Convert to square kilometers
        areas.push([parseInt(key), area]);
      }
      areas.sort(function(a, b) { return a[0] - b[0]; });
      
      var xLabels = areas.map(function(x) { return landcoverVis.names[x[0] - 10]; });
      var yValues = areas.map(function(x) { return x[1]; });
      
      // Create the chart
      var chart = ui.Chart.array.values(yValues, 0, xLabels)
                    .setChartType('ColumnChart') // Set chart type to ColumnChart for bars
                    .setOptions({
                      title: 'Land Cover Area in Selected District (sq km)',
                      hAxis: {title: 'Land Cover Class'},
                      vAxis: {title: 'Area (sq km)'},
                      legend: {position: 'none'},
                      colors: landcoverVis.palette // Match colors with landcoverVis palette
                    });
      
      // Display the chart
      chartPanel.clear();
      chartPanel.add(chart);
    });
  },
  style: {color: 'blue'}
});

// Create a panel to hold the dropdowns and chart
var panel = ui.Panel({
  widgets: [
    ui.Label('India District Land Cover Analysis', {fontSize: '24px', fontWeight: 'bold', color: 'green'}),
    ui.Label('Select a state and district to view the land cover area distribution.', {fontSize: '16px', color: 'brown'}),
    stateSelect,
    districtSelect,
    ui.Label('Select a district to see the land cover area', {fontSize: '16px'})
  ],
  layout: ui.Panel.Layout.Flow('vertical'),
  style: {width: '300px', maxHeight: '600px', padding: '8px', position: 'top-left'}
});

// Create a panel for the chart display
var chartPanel = ui.Panel({
  style: {width: '100%', height: '300px', position: 'bottom-center'}
});

// Add the chart panel to the main panel
panel.add(chartPanel);

// Add the main panel to the map
Map.centerObject(indiaDist, 5);
Map.add(panel);

// Add static legend
var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px'
  }
});

var legendTitle = ui.Label({
  value: 'ESA WorldCover Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});

legend.add(legendTitle);

var makeRow = function(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });
  
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

for (var i = 0; i < landcoverVis.names.length; i++) {
  legend.add(makeRow(landcoverVis.palette[i], landcoverVis.names[i]));
}

// Add legend to map
Map.add(legend);
