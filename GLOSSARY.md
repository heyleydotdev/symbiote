# Symbiote

A desktop video editor. A Project is the unit of work a user opens, and the Projects Page is where Projects start.

## Language

**Project**:
The unit of work a user opens and edits. Owns its Sequences and, later, its media references.
_Avoid_: Session, workspace, document, file

**Project File**:
A single JSON file with the `.sym` extension holding one Project, saved in whatever folder the user picks.
_Avoid_: Save, document, archive

**Sequence**:
A timeline inside a Project. A placeholder today; the editor is the next thing to live here.

**Recent Project**:
A row on the Projects Page remembering a Project File the user created or opened. Not a state of the Project.

**Missing**:
A Recent Project whose Project File is no longer at its recorded path. The row stays until the user removes it; a project is never assumed deleted.

**Projects Page**:
The start screen: search and project list on the left, New project on the right.
_Avoid_: Home, dashboard, archive
