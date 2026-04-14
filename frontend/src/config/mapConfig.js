// Cấu hình bản đồ chuẩn
export const MAP_CONFIG = {
  // CartoDB Voyager — màu sắc đẹp, miễn phí, không watermark VN
  tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  subdomains: ['a', 'b', 'c', 'd'],
  attribution: '© <a href="https://carto.com/">CARTO</a> | © OpenStreetMap contributors',

  // Fallback
  fallbackTileUrl: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png',

  // Defaults cho Việt Nam
  defaultCenter: [16.0544, 108.2022],
  defaultZoom: 6,
  minZoom: 4,
  maxZoom: 18,

  // Bounds Việt Nam — bao gồm Hoàng Sa và Trường Sa
  vietnamBounds: [[5.5, 102.0], [23.5, 117.5]],

  // Quần đảo thuộc chủ quyền Việt Nam
  sovereigntyIslands: [
    { position: [16.50, 111.60], label: 'Quần đảo Hoàng Sa', note: 'Thành phố Đà Nẵng' },
    { position: [8.65,  114.18], label: 'Quần đảo Trường Sa', note: 'Tỉnh Khánh Hòa' },
  ]
};
