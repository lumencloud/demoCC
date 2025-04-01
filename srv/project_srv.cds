using project from '../db/project';

@path               : '/project'
@cds.query.limit.max: 10000

service ProjectService {

    @cds.redirection.target
    @Capabilities: {
        ReadRestrictions.Readable    : true,
        InsertRestrictions.Insertable: true,
        UpdateRestrictions.Updatable : true,
        DeleteRestrictions.Deletable : true
    }
    entity Project      as projection on project.Project;

    @cds.redirection.target
    @Capabilities: {
        ReadRestrictions.Readable    : true,
        InsertRestrictions.Insertable: true,
        UpdateRestrictions.Updatable : true,
        DeleteRestrictions.Deletable : true
    }
    entity Organization as projection on project.Organization;

    @cds.redirection.target
    @Capabilities: {
        ReadRestrictions.Readable    : true,
        InsertRestrictions.Insertable: true,
        UpdateRestrictions.Updatable : true,
        DeleteRestrictions.Deletable : true
    }
    entity Targets      as projection on project.Target;

    view Project_year as select from project.Project_year;
    view Project_view as select from project.Project_view;
    view Project_hierView as select from project.Project_hierView;
    view Project_hierTotalView as select from project.Project_hierTotalView;
    view Project_tableView as select from project.Project_tableView;
}
