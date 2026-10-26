// Drizzle migration'ları `.sql` dosyası olarak üretilir. Native tarayıcıda
// dosya sistemi olmadığı için içerikleri bundle'a string olarak gömülür.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
