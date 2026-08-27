const fs = require('fs');
const p = 'C:/Users/hp/ClinicManagementSystem/src/ClinicManagementSystem.Application/Validators/RegisterUserValidator.cs';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /\.MinimumLength\(8\)\.WithMessage\("Password must be at least 8 characters"\)/,
  '.MinimumLength(12).WithMessage("Password must be at least 12 characters")\n            .Matches("[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character")'
);

fs.writeFileSync(p, c);
console.log("Updated RegisterUserValidator.cs");
