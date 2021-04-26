const { exec } = require('child_process');

console.log(`executing 'ns plugin build'`);
exec('ns plugin build', (err, stdout, stderr) => {
	if (err) {
		// node couldn't execute the command
		console.log(`${err}`);
		return;
	}
});
