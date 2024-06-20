// Load India district shapefile asset
var indiaDistricts = ee.FeatureCollection('users/sachinbobbili/India_Dist');

// Load SRTM Digital Elevation Model (DEM) data
var srtm = ee.Image('CGIAR/SRTM90_V4');

// Create a UI panel for main controls
var mainPanel = ui.Panel({style: {position: 'top-left', height: '100%'}});
mainPanel.style().set('width', '400px');

// Add application title
var title = ui.Label('India District Elevation Explorer', {
  fontWeight: 'bold',
  fontSize: '24px',
  color: 'blue',
  textAlign: 'center'
});
mainPanel.add(title);

// Add application description
var description = ui.Label(
  'This application allows you to explore the elevation data of various districts in India. ' +
  'Select a state and a district to visualize the SRTM DEM data. You can see the minimum ' +
  'and maximum elevation values for the selected district, and click on the map to get ' +
  'the elevation at any specific point within the district.',
  {
    fontWeight: 'bold',
    color: 'green',
    textAlign: 'center',
    whiteSpace: 'pre-line'
  }
);
mainPanel.add(description);

// Initialize state and district lists
var statesList = indiaDistricts.aggregate_array('stname').distinct().sort();
var districtsList = [];

// Define UI elements for main panel
var stateSelect = ui.Select({
  items: statesList.getInfo(),
  placeholder: 'Select state',
  style: {fontWeight: 'bold', color: 'darkred'},
  onChange: function(state) {
    // Filter districts based on selected state
    var stateDistricts = indiaDistricts.filter(ee.Filter.eq('stname', state));
    
    // Get district names for the selected state
    districtsList = stateDistricts.aggregate_array('dtname').distinct().sort().getInfo();
    
    // Clear existing district select options and set new options
    districtSelect.items().reset(districtsList);
  }
});

var districtSelect = ui.Select({
  items: [],
  placeholder: 'Select district',
  style: {fontWeight: 'bold', color: 'darkred'},
  onChange: function(district) {
    // Remove the existing DEM layer if any
    Map.layers().forEach(function(layer) {
      Map.remove(layer);
    });
    
    // Filter India districts to get the selected district geometry
    var selectedDistrict = indiaDistricts.filter(
      ee.Filter.and(
        ee.Filter.eq('stname', stateSelect.getValue()),
        ee.Filter.eq('dtname', district)
      )
    ).geometry();
    
    // Clip SRTM DEM with the selected district geometry
    var demClip = srtm.clip(selectedDistrict);
    
    // Get min and max elevation values
    var stats = demClip.reduceRegion({
      reducer: ee.Reducer.minMax(),
      geometry: selectedDistrict,
      scale: 90,
      maxPixels: 1e9
    });
    
    stats.evaluate(function(result) {
      minLabel.setValue('Min elevation: ' + result['elevation_min'] + ' m');
      maxLabel.setValue('Max elevation: ' + result['elevation_max'] + ' m');
    });
    
    // Display the clipped DEM
    Map.centerObject(selectedDistrict, 8);
    Map.addLayer(demClip, {min: 0, max: 1500, palette: ['#0000FF', '#00FF00', '#FFFF00', '#FFA500', '#FF0000', '#8B0000']}, 'SRTM DEM');
    
    // Set the demClip as a global variable for download
    appState.demClip = demClip;
    
    // Update legend with elevation values
    updateLegend();
  }
});

// Add labels for displaying min and max elevation in main panel
var minLabel = ui.Label('Min elevation:', {fontWeight: 'bold', color: 'black'});
var maxLabel = ui.Label('Max elevation:', {fontWeight: 'bold', color: 'black'});

// Add label for displaying elevation at clicked point in main panel
var elevationLabel = ui.Label('Elevation:', {fontWeight: 'bold', color: 'black'});

// Add download link in main panel
var downloadLink = ui.Label('Download DEM', {fontWeight: 'bold', color: 'darkblue'});
downloadLink.style().set('shown', false); // Hide initially

// Function to update the download link
var updateDownloadLink = function() {
  if (appState.demClip) {
    var region = appState.demClip.geometry().bounds();
    var url = appState.demClip.getDownloadURL({
      name: 'DEM',
      scale: 90,
      crs: 'EPSG:4326',
      region: region
    });
    downloadLink.setUrl(url);
    downloadLink.style().set('shown', true); // Show the link
  } else {
    print('Please select a district to download the DEM.');
  }
};

// Add legend panel for displaying elevation ranges
var legendPanel = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px',
    backgroundColor: 'white',
    border: '1px solid black'
  }
});

// Function to update legend with elevation values
var updateLegend = function() {
  legendPanel.clear();
  var legendTitle = ui.Label('Elevation Legend', {fontWeight: 'bold'});
  legendPanel.add(legendTitle);
  var elevationRanges = ['0-200', '200-400', '400-600', '600-800', '800-1000','1000+'];
  var elevationColors = ['#0000FF', '#00FF00', '#FFFF00', '#FFA500', '#FF0000', '#8B0000'];
  for (var i = 0; i < elevationRanges.length; i++) {
    var colorBox = ui.Label({
      style: {
        backgroundColor: elevationColors[i],
        padding: '8px',
        margin: '0 0 4px 0'
      }
    });
    var elevationRangeLabel = ui.Label(elevationRanges[i], {margin: '0 0 4px 6px'});
    legendPanel.add(colorBox);
    legendPanel.add(elevationRangeLabel);
  }
};

// Add widgets to the main panel
mainPanel.add(ui.Label('Select State', {fontWeight: 'bold', color: 'black'}));
mainPanel.add(stateSelect);
mainPanel.add(ui.Label('Select District', {fontWeight: 'bold', color: 'black'}));
mainPanel.add(districtSelect);
mainPanel.add(minLabel);
mainPanel.add(maxLabel);
mainPanel.add(elevationLabel);
mainPanel.add(downloadLink);

// Add the main panel to the map
Map.add(mainPanel);

// Keep satellite view as the background
Map.setOptions('SATELLITE');

// Function to handle map clicks
Map.onClick(function(coords) {
  var point = ee.Geometry.Point(coords.lon, coords.lat);
  var elevation = srtm.sample(point, 90).first().get('elevation');
  
  elevation.evaluate(function(val) {
    elevationLabel.setValue('Elevation: ' + val + ' m');
  });
});

// App state to store the current DEM clip
var appState = {
  demClip: null
};

// Trigger the download link update when a new district is selected
districtSelect.onChange(updateDownloadLink);

// Add legend panel to the map
Map.add(legendPanel);

// Initialize legend
updateLegend();
