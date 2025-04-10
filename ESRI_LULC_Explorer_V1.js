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
  // Add icons back to the dictionary for legend and potentially buttons
  "icons": [
    '💧', '🌲', '🌿', '🌾', '🏘️', '🏜️',
    '❄️', '☁️', '🐑' // Rangeland icon - using sheep as example
  ]
};

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

// --- Control Panel (Right Side - Enhanced UI) ---
var controlPanel = ui.Panel({
  layout: ui.Panel.Layout.Flow('vertical'),
  style: {
    width: '400px', // Slightly wider for better spacing
    padding: '12px',
    border: '1px solid #ccc',
    stretch: 'vertical', // Allow panel to take available vertical space
    backgroundColor: '#f9f9f9' // Light background color
  }
});

// --- App Title and Description ---
var appTitle = ui.Label({
  value: '🗺️ ESRI LULC Explorer',
  style: {fontWeight: 'bold', fontSize: '22px', margin: '0 0 10px 0', color: '#263238', textAlign: 'center'}
});
var appDescription = ui.Label({
  value: 'Visually compare Land Use/Land Cover (LULC) between two years using the ESRI 10m Global dataset. Draw an Area of Interest (AOI) on the left map to analyze changes, generate download links, and create a time-series GIF (2017-2023).',
  style: {margin: '0 0 15px 0', fontSize: '13px', color: '#5f6368', textAlign: 'justify'} // Justified text
});
controlPanel.add(appTitle);
controlPanel.add(appDescription);


// --- Enhanced Legend Function ---
function addCategoricalLegend(panel, dict, title) {
  panel.add(ui.Label(title, {fontWeight: 'bold', fontSize: '16px', margin: '0 0 8px 0', color: '#333'}));
  var legendGrid = ui.Panel({
      layout: ui.Panel.Layout.Flow('horizontal'),
      style: {stretch: 'horizontal', padding: '0 5px'} // Ensure grid takes full width, add slight padding
  });
  var leftColumn = ui.Panel([], ui.Panel.Layout.Flow('vertical'), {stretch: 'horizontal'});
  var rightColumn = ui.Panel([], ui.Panel.Layout.Flow('vertical'), {stretch: 'horizontal'});

  var numItems = dict.names.length;
  var splitIndex = Math.ceil(numItems / 2);

  for (var i = 0; i < splitIndex; i++) {
    var colorBox = ui.Label({style: {backgroundColor: dict.colors[i], padding: '7px', margin: '0 5px 4px 0', border: '1px solid #eee'}});
    var iconLabel = ui.Label({value: dict.icons[i], style: {margin: '0 4px 4px 0', fontSize: '14px'}}); // Added Icon
    var label = ui.Label({value: dict.names[i], style: {margin: '0 0 4px 2px', fontSize: '12px', color: '#333'}}); // Adjusted margin
    leftColumn.add(ui.Panel([colorBox, iconLabel, label], ui.Panel.Layout.Flow('horizontal'), { margin: '1px 0'})); // Ensure vertical alignment
  }

  for (var j = splitIndex; j < numItems; j++) {
    var colorBox = ui.Label({style: {backgroundColor: dict.colors[j], padding: '7px', margin: '0 5px 4px 0', border: '1px solid #eee'}});
    var iconLabel = ui.Label({value: dict.icons[j], style: {margin: '0 4px 4px 0', fontSize: '14px'}}); // Added Icon
    var label = ui.Label({value: dict.names[j], style: {margin: '0 0 4px 2px', fontSize: '12px', color: '#333'}}); // Adjusted margin
    rightColumn.add(ui.Panel([colorBox, iconLabel, label], ui.Panel.Layout.Flow('horizontal'), { margin: '1px 0'})); // Ensure vertical alignment
  }
  legendGrid.add(leftColumn);
  legendGrid.add(rightColumn);
  panel.add(legendGrid);
}

// Add Legend to Control Panel
addCategoricalLegend(controlPanel, dict, 'Land Cover Legend');
controlPanel.add(ui.Label('Use the drawing tool ( □ ) on the left map to define an Area of Interest (AOI).',
                         {margin: '15px 0px 5px 0px', color: '#5f6368', fontSize: '12px', fontStyle: 'italic'}));


// --- Drawing Tools ---
var drawingTools = leftMap.drawingTools();
drawingTools.setShown(true);
drawingTools.setLinked(false); // Keep tools only on the left map
drawingTools.setDrawModes(['rectangle']); // Start with rectangle drawing enabled
drawingTools.setShape(null);     // Ensure no shape is pre-selected

var currentGeometry = null; // Variable to store the drawn geometry

// --- Enhanced Section Header Style ---
var sectionHeaderStyle = {
  fontWeight: 'bold',
  fontSize: '16px',
  margin: '20px 0 8px 0', // More top margin
  color: '#444',
  borderBottom: '1px solid #ddd', // Subtle separator
  paddingBottom: '4px'
};

// --- Analysis Section ---

var chartPlaceholder = ui.Label('Draw a rectangle on the left map to analyze LULC change.', {margin: '5px 0 4px 0', color: '#777', fontSize: '12px', fontStyle: 'italic'});
var chartPanel = ui.Panel([chartPlaceholder], null, {backgroundColor: '#ffffff', border: '1px solid #eee', padding: '5px'}); // Panel to hold the chart with background

var resetButton = ui.Button({
  label: '🔄 Clear AOI & Reset', // Added Icon
  onClick: clearGeometryAndAnalysis,
  style: {stretch: 'horizontal', margin: '8px 0 5px 0', backgroundColor: '#e0e0e0', color: '#333'}, // Style adjustments
  disabled: true // Disabled initially
});

controlPanel.add(resetButton);
controlPanel.add(chartPanel);

// --- Download Section ---

var downloadPlaceholder = ui.Label('Draw rectangle & click button below.', {margin: '5px 0 4px 0', color: '#777', fontSize: '12px', fontStyle: 'italic'});
var downloadPanel = ui.Panel([downloadPlaceholder], null, {backgroundColor: '#ffffff', border: '1px solid #eee', padding: '5px'}); // Panel for download links

var downloadButton = ui.Button({
  label: '⬇️ Prepare Download Links', // Added Icon
  onClick: handleDownload,
  style: {stretch: 'horizontal', margin: '8px 0 5px 0', backgroundColor: '#e0e0e0', color: '#333'}, // Style adjustments
  disabled: true // Disabled initially
});

controlPanel.add(downloadButton);
controlPanel.add(downloadPanel);

// --- GIF Generation Section ---

var gifPlaceholder = ui.Label('Draw rectangle & click button below.', {margin: '5px 0 4px 0', color: '#777', fontSize: '12px', fontStyle: 'italic'});
var gifPanel = ui.Panel([gifPlaceholder], null, {backgroundColor: '#ffffff', border: '1px solid #eee', padding: '5px'}); // Panel to hold the GIF/link

var gifButton = ui.Button({
  label: '🎞️ Generate LULC GIF (2017-2023)', // Added Icon
  onClick: handleGifGeneration,
  style: {stretch: 'horizontal', margin: '8px 0 5px 0', backgroundColor: '#e0e0e0', color: '#333'}, // Style adjustments
  disabled: true // Disabled initially
});

controlPanel.add(gifButton);
controlPanel.add(gifPanel);


// Function to add year selector to a map
function addLayerSelector(mapToChange, defaultYear, position, side) {
  var label = ui.Label('Select Year:', {fontSize: '12px', color: '#333'}); // Adjusted style
  var select = ui.Select({
    items: availableYears,
    value: defaultYear,
    style: { margin: '0 0 0 8px', fontSize: '12px'}, // Add more space
    onChange: function(year) {
      var image = layers[year];
      mapToChange.layers().set(0, ui.Map.Layer(image, defaultVis, 'LULC ' + year));
      if (side === 'left') leftYear = year;
      else rightYear = year;
      updateAnalysisOnYearChange();
    }
  });

  var yearControlPanel = ui.Panel({
    widgets: [label, select],
    layout: ui.Panel.Layout.Flow('horizontal'),
    style: {
      position: position,
      backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slightly less transparent white
      padding: '6px 10px', // Adjusted padding
      border: '1px solid #ccc', // Slightly darker border
      margin: '10px'
    }
  });

  mapToChange.add(yearControlPanel);

  if (side === 'left') leftSelect = select;
  else rightSelect = select;
}

// --- Helper Functions ---

// Clear geometry and reset analysis/download/gif panels
function clearGeometryAndAnalysis() {
  currentGeometry = null;
  drawingTools.layers().reset();
  chartPanel.widgets().reset([chartPlaceholder]);
  downloadPanel.widgets().reset([downloadPlaceholder]);
  gifPanel.widgets().reset([gifPlaceholder]);
  resetButton.setDisabled(true);
  downloadButton.setDisabled(true);
  gifButton.setDisabled(true);
  drawingTools.setShape(null);
  drawingTools.setDrawModes(['rectangle']);
}

// Generate download links
function handleDownload() {
  if (!currentGeometry) {
    downloadPanel.widgets().reset([ui.Label('⚠️ Please draw an AOI rectangle first.', {color: '#d9534f', fontSize: '12px'})]); // Enhanced message
    ui.util.setTimeout(function() { if (!currentGeometry) { downloadPanel.widgets().reset([downloadPlaceholder]); } }, 3500); // Slightly longer timeout
    return;
  }

  downloadPanel.widgets().reset([ui.Label('⏳ Generating download links...', {color: '#777', fontSize: '12px'})]);

  var leftImage = layers[leftYear].clip(currentGeometry);
  var rightImage = layers[rightYear].clip(currentGeometry);
  var scale = 10;
  var downloadArgsBase = { scale: scale, region: currentGeometry, filePerBand: false, format: 'GeoTIFF' };
  var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  var leftFilename = 'LULC_AOI_' + leftYear + '_' + timestamp;
  var rightFilename = 'LULC_AOI_' + rightYear + '_' + timestamp;

  // Use evaluate with better error reporting
  leftImage.getDownloadURL(ee.Dictionary(downloadArgsBase).set('name', leftFilename), function(leftUrl, leftErr) {
    if (leftErr || !leftUrl) {
      print('Left Download Error:', leftErr);
      downloadPanel.widgets().reset([ui.Label('❌ Error generating link for ' + leftYear + '.', {color: '#d9534f', fontSize: '12px'})]);
      return;
    }
    rightImage.getDownloadURL(ee.Dictionary(downloadArgsBase).set('name', rightFilename), function(rightUrl, rightErr) {
      if (rightErr || !rightUrl) {
        print('Right Download Error:', rightErr);
        downloadPanel.widgets().reset([ui.Label('❌ Error generating link for ' + rightYear + '.', {color: '#d9534f', fontSize: '12px'})]);
        return;
      }

      // Update panel with clearer links
      downloadPanel.widgets().reset([
        ui.Label('✅ Download Links (GeoTIFF, 10m):', {fontWeight: 'bold', fontSize: '13px', color: '#167015'}), // Green color for success
        ui.Label('📄 ' + leftYear + ' LULC Data', {margin: '4px 0 2px 8px', color: '#007bff'}).setUrl(leftUrl), // Added icon and styling
        ui.Label('📄 ' + rightYear + ' LULC Data', {margin: '2px 0 4px 8px', color: '#007bff'}).setUrl(rightUrl) // Added icon and styling
      ]);
    });
  });
}


// Generate the comparison chart (Using pixel counts as per provided code)
function generateChart(geom) {
  if (!geom) { chartPanel.widgets().reset([chartPlaceholder]); return; }
  chartPanel.widgets().reset([ui.Label('⏳ Calculating LULC statistics...', {color: '#777', fontSize: '12px'})]);

  var leftImage = layers[leftYear];
  var rightImage = layers[rightYear];
  var scale = 10;
  var reducer = ee.Reducer.frequencyHistogram();
  var commonReduceArgs = { reducer: reducer, geometry: geom, scale: scale, maxPixels: 1e10, tileScale: 4 }; // Added tileScale

  var leftStats = leftImage.reduceRegion(commonReduceArgs);
  var rightStats = rightImage.reduceRegion(commonReduceArgs);

  ee.Dictionary(leftStats.get('lulc')).evaluate(function(leftHist, leftError) {
    if (leftError || !leftHist) {
      print('Left Stats Error:', leftError);
      chartPanel.widgets().reset([ui.Label('❌ Error calculating stats for ' + leftYear + '.', {color: '#d9534f', fontSize: '12px'})]);
      return;
    }
    ee.Dictionary(rightStats.get('lulc')).evaluate(function(rightHist, rightError) {
      if (rightError || !rightHist) {
        print('Right Stats Error:', rightError);
        chartPanel.widgets().reset([ui.Label('❌ Error calculating stats for ' + rightYear + '.', {color: '#d9534f', fontSize: '12px'})]);
        return;
      }
      leftHist = leftHist || {}; rightHist = rightHist || {};
      var chartData = [['Class', leftYear + ' (pixels)', rightYear + ' (pixels)']];
      var hasData = false;
      for (var i = 0; i < dict.names.length; i++) {
        var classCodeStr = String(i + 1); var className = dict.names[i];
        var leftCount = leftHist[classCodeStr] || 0; var rightCount = rightHist[classCodeStr] || 0;
        chartData.push([className, leftCount, rightCount]);
        if (leftCount > 0 || rightCount > 0) hasData = true;
      }
      if (!hasData) {
        chartPanel.widgets().reset([ui.Label('⚠️ No LULC data found in the AOI for selected years.', {color: '#ffa726', fontSize: '12px'})]); // Warning color
        return;
      }
      // Create and display the chart with enhanced styling
      var chart = ui.Chart(chartData).setChartType('ColumnChart').setOptions({
          title: 'LULC Comparison (' + leftYear + ' vs ' + rightYear + ')',
          hAxis: {title: 'Land Cover Class', slantedText: true, slantedTextAngle: 30, textStyle: {color: '#333', fontSize: 11}}, // Adjusted angle/size
          vAxis: {title: 'Pixel Count (10m x 10m)', format: 'short', textStyle: {color: '#333', fontSize: 11}},
          height: '260px', // Adjusted height
          colors: ['#4285F4', '#DB4437'], // Google colors
          legend: {position: 'top', alignment: 'center', textStyle: {color: '#333', fontSize: 12}},
          bar: { groupWidth: '75%' }, // Adjusted bar width
          chartArea: {width: '85%', height: '65%'}, // Ensure space for axes
          titleTextStyle: {color: '#333', fontSize: 14, bold: false} // Adjusted title style
      });
      chartPanel.widgets().reset([chart]);
    });
  });
}


// Handle GIF generation (Using the paint/blend method from provided code, but be aware it might be slow/inefficient)
function handleGifGeneration() {
    if (!currentGeometry) {
        gifPanel.widgets().reset([ui.Label('⚠️ Please draw an AOI rectangle first.', {color: '#d9534f', fontSize: '12px'})]);
        ui.util.setTimeout(function() { if (!currentGeometry) { gifPanel.widgets().reset([gifPlaceholder]); } }, 3500);
        return;
    }
    gifPanel.widgets().reset([ui.Label('⏳ Generating GIF (this may take a moment)...', {color: '#777', fontSize: '12px'})]);

    // --- Create Image Collection for GIF ---
    // WARNING: The 'paint' method used here can be very slow for large areas or many years.
    // It paints the *entire feature* based on its properties.
    var gifImages = availableYears.map(function(yearStr) {
        var image = layers[yearStr].clip(currentGeometry);
        var year = parseInt(yearStr, 10);

        // Attempting text annotation using paint/blend (may be slow/inefficient)
        // Create a basic text label image - this approach paints *everywhere*
        // A better approach would involve ee.Algorithms.Text.draw or painting at a specific point.
        var textImage = ee.Image().paint(ee.FeatureCollection(ee.Feature(null, {'label': year})), 'ffffff', 3) // Paint color, line width
                           .visualize({palette: 'FF0000', min: 2017, max: 2023}); // Red text, requires setting min/max based on year range for consistent color

        var annotatedImage = image.visualize(defaultVis)
                                   .blend(textImage); // Blend text on top

        return annotatedImage.set('year', year);
    });
    var gifCollection = ee.ImageCollection.fromImages(gifImages);

    // --- Define GIF parameters ---
     var gifParams = {
        region: currentGeometry, dimensions: 512, // Slightly higher resolution
        crs: 'EPSG:3857', framesPerSecond: 1.5, // Slower speed
        format: 'gif'
     };

    // --- Generate and display the GIF ---
    var thumb = ui.Thumbnail({
        image: gifCollection, params: gifParams,
        style: {
            width: '95%', // Use percentage width
            // height: '300px', // Fixed height or let aspect ratio define
            margin: '10px auto 5px auto', // Center horizontally
            border: '1px solid #ccc',
            backgroundColor: '#f0f0f0' // Background while loading
        }
    });

    // Add the thumbnail to the panel
    gifPanel.widgets().reset([
        ui.Label('🎞️ LULC Change GIF (2017-2023):', {fontWeight: 'bold', fontSize: '13px'}),
        thumb,
        ui.Label('Note: Text annotation might be slow/imprecise.', {fontSize: '10px', color: '#888'}) // Add note
    ]);
}


// Function to run when drawing/editing is completed
function onDrawOrEditComplete(geometry, layer) {
  currentGeometry = geometry;
  drawingTools.setShape(null);
  drawingTools.setDrawModes([]);
  resetButton.setDisabled(false);
  downloadButton.setDisabled(false);
  gifButton.setDisabled(false);
  downloadPanel.widgets().reset([downloadPlaceholder]);
  gifPanel.widgets().reset([gifPlaceholder]);
  generateChart(currentGeometry);
}

// Function to update analysis when year selectors change
function updateAnalysisOnYearChange() {
  if (currentGeometry) {
    generateChart(currentGeometry);
    downloadPanel.widgets().reset([downloadPlaceholder]);
    gifPanel.widgets().reset([gifPlaceholder]);
    downloadButton.setDisabled(false);
    gifButton.setDisabled(false);
  }
}

// Register geometry callbacks
drawingTools.onDraw(onDrawOrEditComplete);
drawingTools.onEdit(onDrawOrEditComplete);


// --- Final Assembly ---
// Add year selectors to maps
addLayerSelector(leftMap, leftYear, 'top-left', 'left');
addLayerSelector(rightMap, rightYear, 'top-right', 'right');

// Create the split panel for the maps
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  wipe: true, // Enable wipe functionality
  style: {stretch: 'both'} // Make split panel fill space
});

// Reset the root widgets and add the split panel (maps) and the control panel
ui.root.widgets().reset([splitPanel]);
ui.root.add(controlPanel); // Add control panel to the right

// Link map movements
var linker = ui.Map.Linker([leftMap, rightMap]);

// Set initial map center and zoom (using provided location)
var initialCenter = {lon: 78.5, lat: 17.5, zoom: 12}; // Hyderabad, India (as per context)
leftMap.setCenter(initialCenter.lon, initialCenter.lat, initialCenter.zoom);

// Initial UI state setup
clearGeometryAndAnalysis(); // Ensure buttons are disabled and placeholders shown initially
