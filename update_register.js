const fs = require('fs');
const p = 'C:/Users/hp/clinic-client/src/app/features/register/register.component.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /Validators\.minLength\(8\),\s*Validators\.pattern\('\^\(\?\=\.\*\[A-Z\]\)\(\?\=\.\*\[a-z\]\)\(\?\=\.\*\[0-9\]\)\.\+\$'\)/,
  "Validators.minLength(12),\n      Validators.pattern('^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).+$')"
);

fs.writeFileSync(p, c);
console.log("Updated register.component.ts");
