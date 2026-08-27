const fs = require('fs');
const p = 'C:/Users/hp/clinic-client/angular.json';
let obj = JSON.parse(fs.readFileSync(p, 'utf8'));

try {
  const budgets = obj.projects['clinic-client'].architect.build.configurations.production.budgets;
  
  budgets.forEach(b => {
    if (b.type === 'anyComponentStyle') {
      b.maximumWarning = '50kB';
      b.maximumError = '100kB';
    }
  });

  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  console.log('Successfully updated angular.json budget settings');
} catch (e) {
  console.error('Error modifying angular.json:', e.message);
}
