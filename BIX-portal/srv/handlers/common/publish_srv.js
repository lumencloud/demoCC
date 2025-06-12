const cds = require('@sap/cds')

module.exports = class PublishService extends cds.ApplicationService {
  init() {
      const get_dashboard_content = require('./get_dashboard_content');
      get_dashboard_content(this);
      const get_dashboard_display_content = require('./get_dashboard_display_content');
      get_dashboard_display_content(this);
      const event_dashboard_set = require('./event_dashboard_set');
      event_dashboard_set(this);

    return super.init()
  }
}