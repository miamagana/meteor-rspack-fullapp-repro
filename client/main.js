import { Template } from 'meteor/templating';
import './main.html';

// Pure JS side effect living inside the client rspack bundle. If the bundle
// never loads, this never runs and window.__CLIENT_BOOTED__ stays undefined.
window.__CLIENT_BOOTED__ = true;

Template.hello.helpers({ greeting: () => 'client booted' });
