// Load ESRI 10m LULC dataset
var esri_lulc10 = ee.ImageCollection("projects/sat-io/open-datasets/landcover/ESRI_Global-LULC_10m_TS");

// LULC dictionary (using 1-based index for remapped values)
var dict = {
  "names": [
    "Water", "Trees", "Flooded Vegetation", "Crops", "Built Area", "Bare Ground",
    "Snow/Ice", "Clouds", "Rangeland"
  ],
  "colors": [
    "#1A5BAB", "#358221", "#87D19E", "#FFDB5C", "#ED022A", "#EDE9E4",
    "#F2FAFF", "#C8C8C8", "#C6AD8D"
  ],
  "icons": [
    '💧', '🌲', '🌿', '🌾', '🏘️', '🏜️',
    '❄️', '☁️', '🐑'
  ]
};

// --- Helper Constants ---
var pixelAreaSqKm = 10 * 10 / (1000 * 1000); // Area of one 10m pixel in Sq. Km

// Remap function: Original values -> Sequential 1-based index
function remapper(image) {
  return image.remap([1, 2, 4, 5, 7, 8, 9, 10, 11], [1, 2, 3, 4, 5, 6, 7, 8, 9])
      .rename('lulc')
      .copyProperties(image, ['system:time_start']);
}

// Get LULC image for a year and store year property
function getYearComposite(yearStr) {
  var year = parseInt(yearStr, 10);
  var yearCollection = esri_lulc10
    .filterDate(yearStr + '-01-01', yearStr + '-12-31');
  var remappedCollection = yearCollection.map(remapper);
  var composite = remappedCollection.mosaic(); // Use mosaic for simplicity
  return composite.set('year', year);
}

// --- Pre-load all layers ---
var layers = {};
var availableYears = ['2017', '2018', '2019', '2020', '2021', '2022', '2023'];
availableYears.forEach(function(year) {
  layers[year] = getYearComposite(year);
});

// --- UI Setup ---
// Create two maps
var leftMap = ui.Map();
var rightMap = ui.Map();
leftMap.setControlVisibility(false);
rightMap.setControlVisibility(false);
leftMap.setOptions('SATELLITE');
rightMap.setOptions('SATELLITE');

// Default years
var leftYear = '2017';
var rightYear = '2023';
var leftSelect, rightSelect; // Will hold the select widgets

// Default visualization parameters
var defaultVis = {min: 1, max: 9, palette: dict.colors};

// Add initial layers
leftMap.addLayer(layers[leftYear], defaultVis, 'LULC ' + leftYear);
rightMap.addLayer(layers[rightYear], defaultVis, 'LULC ' + rightYear);

// --- Create Main Panel Structure ---
var mainPanel = ui.Panel({
  layout: ui.Panel.Layout.Flow('vertical'),
  style: {stretch: 'both'}
});

// App Title
var appTitle = ui.Label({
  value: 'ESRI LULC 10m Time Series Explorer',
  style: {fontWeight: 'bold', fontSize: '24px', margin: '10px 15px', color: '#333'}
});
mainPanel.add(appTitle); // Add title first

// Create the split panel for the maps
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  wipe: true, // Enable wipe functionality
  style: {stretch: 'both'} // Make split panel fill space
});
mainPanel.add(splitPanel); // Add map panel to the main vertical panel

// --- Horizontal Control Panel (Bottom) ---
var controlPanel = ui.Panel({
  layout: ui.Panel.Layout.Flow('horizontal'),
  style: {
    height: '35%', // Adjust height as needed
    width: '100%',
    padding: '5px',
    border: '1px solid #ccc',
    backgroundColor: '#f8f8f8',
    stretch: 'horizontal' // Ensure it takes full width
  }
});
mainPanel.add(controlPanel); // Add control panel to the bottom

// --- Define the 4 sections for the bottom panel ---
var sectionStyle = {
  width: '24%', // Distribute width (adjust if needed for padding/borders)
  margin: '0 5px',
  padding: '5px',
  border: '1px solid #ddd',
  stretch: 'vertical', // Make sections fill height of control panel
  backgroundColor: '#fff'
};

var legendPanel = ui.Panel({layout: ui.Panel.Layout.Flow('vertical'), style: sectionStyle});
var chartSectionPanel = ui.Panel({layout: ui.Panel.Layout.Flow('vertical'), style: sectionStyle});
var downloadSectionPanel = ui.Panel({layout: ui.Panel.Layout.Flow('vertical'), style: sectionStyle});
var gifSectionPanel = ui.Panel({layout: ui.Panel.Layout.Flow('vertical'), style: sectionStyle});

// Add sections to the horizontal control panel
controlPanel.add(legendPanel);
controlPanel.add(chartSectionPanel);
controlPanel.add(downloadSectionPanel);
controlPanel.add(gifSectionPanel);

// --- Section 1: Legend ---
// Function to add the legend to a panel in two columns with icons
function addCategoricalLegend(panel, dict, title) {
  panel.add(ui.Label(title, {fontWeight: 'bold', fontSize: '14px', margin: '5px 0 6px 5px', color: '#333'}));
  var legendGrid = ui.Panel({
    layout: ui.Panel.Layout.Flow('horizontal'),
    style: {stretch: 'horizontal', margin: '0 5px'} // Ensure grid takes full width
  });
  var leftColumn = ui.Panel([], ui.Panel.Layout.Flow('vertical'), {stretch: 'horizontal'});
  var rightColumn = ui.Panel([], ui.Panel.Layout.Flow('vertical'), {stretch: 'horizontal'});

  var numItems = dict.names.length;
  var splitIndex = Math.ceil(numItems / 2);

  for (var i = 0; i < splitIndex; i++) {
    var colorBox = ui.Label({style: {backgroundColor: dict.colors[i], padding: '6px', margin: '0 3px 3px 0', border: '1px solid #eee'}});
    var iconLabel = ui.Label({value: dict.icons[i], style: {margin: '0 3px 3px 0', fontSize: '12px'}});
    var label = ui.Label({value: dict.names[i], style: {margin: '0 0 3px 4px', fontSize: '11px', color: '#333'}});
    leftColumn.add(ui.Panel([colorBox, iconLabel, label], ui.Panel.Layout.Flow('horizontal'), {margin: '1px 0'}));
  }

  for (var j = splitIndex; j < numItems; j++) {
    var colorBox = ui.Label({style: {backgroundColor: dict.colors[j], padding: '6px', margin: '0 3px 3px 0', border: '1px solid #eee'}});
    var iconLabel = ui.Label({value: dict.icons[j], style: {margin: '0 3px 3px 0', fontSize: '12px'}});
    var label = ui.Label({value: dict.names[j], style: {margin: '0 0 3px 4px', fontSize: '11px', color: '#333'}});
    rightColumn.add(ui.Panel([colorBox, iconLabel, label], ui.Panel.Layout.Flow('horizontal'), {margin: '1px 0'}));
  }
  legendGrid.add(leftColumn);
  legendGrid.add(rightColumn);
  panel.add(legendGrid);
}

// Add Legend to Legend Panel
addCategoricalLegend(legendPanel, dict, 'Land Cover Legend');
legendPanel.add(ui.Label('Use the drawing tool ( □ ) on the left map to define an Area of Interest (AOI).',
                         {margin: '10px 5px 5px 5px', color: '#555', fontSize: '12px'}));

// --- Drawing Tools ---
var drawingTools = leftMap.drawingTools();
drawingTools.setShown(true);
drawingTools.setLinked(false); // Keep tools only on the left map
drawingTools.setDrawModes(['rectangle']); // Start with rectangle drawing enabled
drawingTools.setShape(null);     // Ensure no shape is pre-selected

var currentGeometry = null; // Variable to store the drawn geometry

// --- Section 2: AOI Analysis & Chart ---
chartSectionPanel.add(ui.Label('AOI Analysis', {fontWeight: 'bold', margin: '5px 0 5px 5px', fontSize: '14px', color: '#333'}));

var chartPlaceholder = ui.Label('Draw AOI for LULC change analysis.', {margin: '5px 5px 10px 5px', color: '#777', fontSize: '12px'});
var chartPanel = ui.Panel([chartPlaceholder], null, {stretch: 'vertical'}); // Panel to hold the chart, allow vertical stretch

var resetButton = ui.Button({
  label: '🔄 Clear AOI & Reset',
  onClick: clearGeometryAndAnalysis,
  style: {stretch: 'horizontal', margin: '5px 5px', backgroundColor: '#eee', color: '#333', fontSize: '12px'},
  disabled: true // Disabled initially
});

chartSectionPanel.add(resetButton);
chartSectionPanel.add(chartPanel); // Add chart panel last so it can expand


// --- Section 3: Download AOI Data ---
downloadSectionPanel.add(ui.Label('Download AOI Data', {fontWeight: 'bold', margin: '5px 0 5px 5px', fontSize: '14px', color: '#333'}));

var downloadPlaceholder = ui.Label('Draw AOI & click button.', {margin: '5px 5px 10px 5px', color: '#777', fontSize: '12px'});
var downloadPanel = ui.Panel([downloadPlaceholder]); // Panel for download links

var downloadButton = ui.Button({
  label: '⬇️ Prepare Download Links',
  onClick: handleDownload,
  style: {stretch: 'horizontal', margin: '5px 5px', backgroundColor: '#eee', color: '#333', fontSize: '12px'},
  disabled: true // Disabled initially
});

downloadSectionPanel.add(downloadButton);
downloadSectionPanel.add(downloadPanel);

// --- Section 4: AOI Time Series GIF ---
gifSectionPanel.add(ui.Label('AOI Time Series GIF', {fontWeight: 'bold', margin: '5px 0 5px 5px', fontSize: '14px', color: '#333'}));

var gifPlaceholder = ui.Label('Draw AOI & click button.', {margin: '5px 5px 10px 5px', color: '#777', fontSize: '12px'});
var gifPanel = ui.Panel([gifPlaceholder]); // Panel to hold the GIF/link

var gifButton = ui.Button({
  label: '🎬 Generate LULC GIF',
  onClick: handleGifGeneration,
  style: {stretch: 'horizontal', margin: '5px 5px', backgroundColor: '#eee', color: '#333', fontSize: '12px'},
  disabled: true // Disabled initially
});

gifSectionPanel.add(gifButton);
gifSectionPanel.add(gifPanel);


// Function to add year selector to a map
function addLayerSelector(mapToChange, defaultYear, position, side) {
  var label = ui.Label('Year:', {color: '#333', fontSize: '12px'});
  var select = ui.Select({
    items: availableYears,
    value: defaultYear,
    style: { margin: '0 0 0 5px', fontSize: '12px'}, // Add some space
    onChange: function(year) {
      var image = layers[year];
      // Update the map layer
      mapToChange.layers().set(0, ui.Map.Layer(image, defaultVis, 'LULC ' + year));
      // Update the global year variable for the respective side
      if (side === 'left') leftYear = year;
      else rightYear = year;
      // Update analysis if geometry exists
      updateAnalysisOnYearChange();
    }
  });

  var yearControlPanel = ui.Panel({
    widgets: [label, select],
    layout: ui.Panel.Layout.Flow('horizontal'),
    style: {
      position: position,
      backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slightly transparent white
      padding: '4px 8px',
      border: '1px solid #ccc',
      margin: '10px'
    }
  });

  mapToChange.add(yearControlPanel);

  // Store the select widget reference
  if (side === 'left') leftSelect = select;
  else rightSelect = select;
}

// --- Helper Functions ---

// Clear geometry and reset analysis/download/gif panels
function clearGeometryAndAnalysis() {
  currentGeometry = null;
  drawingTools.layers().reset(); // Clears drawn shapes from the map layer
  chartPanel.widgets().reset([chartPlaceholder]);
  downloadPanel.widgets().reset([downloadPlaceholder]);
  gifPanel.widgets().reset([gifPlaceholder]);
  resetButton.setDisabled(true);
  downloadButton.setDisabled(true);
  gifButton.setDisabled(true);
  drawingTools.setShape(null); // Clears the current drawing interaction state
  drawingTools.setDrawModes(['rectangle']); // Re-enable drawing
}

// Generate download links
function handleDownload() {
  if (!currentGeometry) {
    downloadPanel.widgets().reset([ui.Label('⚠️ Please draw an AOI first.', {color: '#d9534f', fontSize:'11px'})]);
    ui.util.setTimeout(function() {
      if (!currentGeometry) { // Check again in case it was drawn quickly
        downloadPanel.widgets().reset([downloadPlaceholder]);
      }
    }, 3000);
    return;
  }

  downloadPanel.widgets().reset([ui.Label('⏳ Generating links...', {color: '#777', fontSize:'11px'})]);

  var leftImage = layers[leftYear].clip(currentGeometry);
  var rightImage = layers[rightYear].clip(currentGeometry);
  var scale = 10; // ESRI LULC is 10m

  // Base arguments, name will be overwritten
  var downloadArgsBase = {
    scale: scale,
    region: currentGeometry,
    filePerBand: false,
    format: 'GeoTIFF' // Default to GeoTIFF
  };

  // Use ISO timestamp to ensure unique filenames
  var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  var leftFilename = 'LULC_AOI_' + leftYear + '_' + timestamp;
  var rightFilename = 'LULC_AOI_' + rightYear + '_' + timestamp;

  // Use evaluate to handle potential errors during URL generation
  leftImage.getDownloadURL(ee.Dictionary(downloadArgsBase).set('name', leftFilename), function(leftUrl, leftErr) {
    if (leftErr) {
      print('Left Download Error:', leftErr);
      downloadPanel.widgets().reset([ui.Label('❌ Error (Left): ' + leftErr.slice(0,100)+'...', {color: '#d9534f', fontSize:'11px'})]);
      return;
    }
    rightImage.getDownloadURL(ee.Dictionary(downloadArgsBase).set('name', rightFilename), function(rightUrl, rightErr) {
      if (rightErr) {
        print('Right Download Error:', rightErr);
        downloadPanel.widgets().reset([ui.Label('❌ Error (Right): ' + rightErr.slice(0,100)+'...', {color: '#d9534f', fontSize:'11px'})]);
        return;
      }

      // Update panel with links
      downloadPanel.widgets().reset([
        ui.Label('⬇️ Links (GeoTIFF, 10m):', {fontWeight: 'bold', color: '#333', fontSize:'12px'}),
        ui.Label(leftYear + ' LULC', {margin: '2px 0 2px 5px', color: '#007bff', fontSize:'11px'}).setUrl(leftUrl),
        ui.Label(rightYear + ' LULC', {margin: '2px 0 2px 5px', color: '#007bff', fontSize:'11px'}).setUrl(rightUrl)
      ]);
    });
  });
}

// Generate the comparison chart (MODIFIED FOR SQ. KM)
function generateChart(geom) {
  if (!geom) {
    chartPanel.widgets().reset([chartPlaceholder]); // Should not happen if called correctly
    return;
  }
  chartPanel.widgets().reset([ui.Label('⏳ Calculating LULC area...', {color: '#777', fontSize:'11px'})]);

  var leftImage = layers[leftYear];
  var rightImage = layers[rightYear];
  var scale = 10; // Match data resolution
  var reducer = ee.Reducer.frequencyHistogram();

  // Calculate histograms for both images within the geometry
  var leftStats = leftImage.reduceRegion({
    reducer: reducer,
    geometry: geom,
    scale: scale,
    maxPixels: 1e10, // Allow large regions, might need adjustment
    tileScale: 4 // Increase tileScale to potentially avoid computation timeouts
  });

  var rightStats = rightImage.reduceRegion({
    reducer: reducer,
    geometry: geom,
    scale: scale,
    maxPixels: 1e10,
    tileScale: 4
  });

  // Use evaluate to get the results asynchronously and handle potential errors
  ee.Dictionary(leftStats.get('lulc')).evaluate(function(leftHist, leftError) {
    if (leftError || !leftHist) {
      print('Left Stats Error:', leftError);
      chartPanel.widgets().reset([ui.Label('❌ Error calculating area for ' + leftYear + '.', {color: '#d9534f', fontSize:'11px'})]);
      return;
    }
    ee.Dictionary(rightStats.get('lulc')).evaluate(function(rightHist, rightError) {
      if (rightError || !rightHist) {
        print('Right Stats Error:', rightError);
        chartPanel.widgets().reset([ui.Label('❌ Error calculating area for ' + rightYear + '.', {color: '#d9534f', fontSize:'11px'})]);
        return;
      }

      // Ensure histograms are objects even if empty
      leftHist = leftHist || {};
      rightHist = rightHist || {};

      var chartData = [['Class', leftYear + ' (Sq. km)', rightYear + ' (Sq. km)']];
      var hasData = false;

      // Populate chart data using the dictionary names/order
      for (var i = 0; i < dict.names.length; i++) {
        var classCodeStr = String(i + 1); // Remapped codes are 1-based
        var className = dict.names[i];
        var leftCount = leftHist[classCodeStr] || 0; // Use string keys as histograms return strings
        var rightCount = rightHist[classCodeStr] || 0;

        // Convert pixel counts to Square Kilometers
        var leftArea = leftCount * pixelAreaSqKm;
        var rightArea = rightCount * pixelAreaSqKm;

        chartData.push([className, leftArea, rightArea]);
        if (leftCount > 0 || rightCount > 0) hasData = true;
      }

      if (!hasData) {
        chartPanel.widgets().reset([ui.Label('⚠️ No LULC data found in AOI for selected years.', {color: '#ffa726', fontSize:'11px'})]);
        return;
      }

      // Create and display the chart
      var chart = ui.Chart(chartData)
        .setChartType('ColumnChart')
        .setOptions({
          title: 'LULC Area Comparison (' + leftYear + ' vs ' + rightYear + ')',
          hAxis: {title: 'Land Cover Class', slantedText: true, slantedTextAngle: 30, textStyle: {color: '#333', fontSize: 10}},
          vAxis: {title: 'Area (Sq. km)', format: 'short', textStyle: {color: '#333', fontSize: 10}}, // Updated Axis Label
          //height: '200px', // Adjust height dynamically? Chart panel has stretch: vertical
          chartArea: {width: '80%', height: '65%'}, // Give more space to chart area
          colors: ['#4285f4', '#ea4335'], // Distinct Google brand colors for bars
          legend: {position: 'top', alignment: 'center', textStyle: {color: '#333', fontSize: 11}},
          bar: { groupWidth: '80%' }, // Adjust bar width/spacing
          titleTextStyle: {color: '#333', fontSize: 12, bold: false}
        });

      chartPanel.widgets().reset([chart]);
    });
  });
}

// (Keep the code above this function as it was in the previous correct version)

// Handle GIF generation
function handleGifGeneration() {
    if (!currentGeometry) {
        gifPanel.widgets().reset([ui.Label('Error: Please draw an AOI first.', {color: 'red'})]);
        ui.util.setTimeout(function() {
          if (!currentGeometry) { // Re-check
              gifPanel.widgets().reset([gifPlaceholder]);
          }
        }, 3000);
        return;
    }

    gifPanel.widgets().reset([ui.Label('Generating GIF (this may take a moment)...', {color: 'grey'})]);

    // --- Create Image Collection for GIF ---
    var gifImages = availableYears.map(function(yearStr) {
        var image = layers[yearStr].clip(currentGeometry);
        // Add year text annotation
        var year = parseInt(yearStr, 10);
        var textImage = ee.Image().paint(ee.FeatureCollection(ee.Feature(null, {'label': year})), '000000', 2)
                           .visualize({palette: 'FF0000'}); // Red text

        var annotatedImage = image.visualize(defaultVis)
                                  .blend(textImage); // Blend text on top

        return annotatedImage.set('year', year); // Keep year property if needed
    });
    var gifCollection = ee.ImageCollection.fromImages(gifImages);

    // --- Define GIF parameters ---
    var gifParams = {
      region: currentGeometry,
      dimensions: 480, // Max dimension in pixels (adjust as needed)
      crs: 'EPSG:3857', // Web Mercator
      framesPerSecond: 2, // Speed of animation
      format: 'gif'
    };

    // --- Generate and display the GIF ---
    // Use ui.Thumbnail for direct display - simpler than getUrl + setUrl
    var thumb = ui.Thumbnail({
        image: gifCollection,
        params: gifParams,
        style: {
            width: '340px', // Match panel width roughly
            height: '340px',
            margin: '10px 0 0 0',
            border: '1px solid black'
        }
    });

    // Add the thumbnail to the panel
    gifPanel.widgets().reset([
        ui.Label('LULC Change (2017-2023):', {fontWeight: 'bold'}),
        thumb
    ]);
}



// Function to run when drawing/editing is completed
// ... (rest of the script remains the same) ...

// Function to run when drawing/editing is completed
function onDrawOrEditComplete(geometry, layer) {
  currentGeometry = geometry;
  drawingTools.setShape(null); // Stop drawing/editing mode
  drawingTools.setDrawModes([]); // Disable further drawing until reset

  // Enable buttons
  resetButton.setDisabled(false);
  downloadButton.setDisabled(false);
  gifButton.setDisabled(false);

  // Clear previous results and generate new ones
  downloadPanel.widgets().reset([downloadPlaceholder]);
  gifPanel.widgets().reset([gifPlaceholder]);
  generateChart(currentGeometry);
}

// Function to update analysis when year selectors change
function updateAnalysisOnYearChange() {
  if (currentGeometry) {
    generateChart(currentGeometry);
    // Clear download/gif as they depend on the selected years or full range
    downloadPanel.widgets().reset([downloadPlaceholder]);
    gifPanel.widgets().reset([gifPlaceholder]);
    // Re-enable buttons if geometry exists
    downloadButton.setDisabled(false); // Download depends on selected years
    gifButton.setDisabled(false);      // GIF always uses full range
  }
}

// Register geometry callbacks
drawingTools.onDraw(onDrawOrEditComplete);
drawingTools.onEdit(onDrawOrEditComplete);

// --- Final Assembly ---
// Add year selectors to maps
addLayerSelector(leftMap, leftYear, 'top-left', 'left');
addLayerSelector(rightMap, rightYear, 'top-right', 'right');

// Reset the root widgets and add the main panel which contains everything
ui.root.widgets().reset([mainPanel]);
ui.root.setLayout(ui.Panel.Layout.Flow('vertical')); // Ensure root layout is vertical

// Link map movements
var linker = ui.Map.Linker([leftMap, rightMap]);

// Set initial map center and zoom
var initialCenter = {lon: 78.5, lat: 17.5, zoom: 12}; // Example: Hyderabad, India
leftMap.setCenter(initialCenter.lon, initialCenter.lat, initialCenter.zoom);

// Initial UI state setup
clearGeometryAndAnalysis(); // Ensure buttons are disabled and placeholders shown initially

