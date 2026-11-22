//! Project files and the recent-projects index.
//!
//! A project is one JSON file the user saves wherever they like. The index is
//! a convenience list of paths in app data, never the source of truth: losing it
//! costs the user the list, not the projects.

use std::{
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tracing::{debug, info, instrument, warn};

pub const PROJECT_VERSION: u32 = 1;

const PROJECT_EXTENSION: &str = "sym";
const STATE_FILE: &str = "state.json";
const DEFAULT_PROJECTS_FOLDER: &str = "Symbiote";
const MAX_NAME_LENGTH: usize = 120;
const MAX_RECENT_PROJECTS: usize = 50;
const WINDOWS_RESERVED_NAMES: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub version: u32,
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub sequences: Vec<Sequence>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sequence {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    pub opened_at: i64,
    pub missing: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedProject {
    pub path: String,
    pub project: Project,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectError {
    pub code: ProjectErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProjectErrorCode {
    InvalidName,
    InvalidPath,
    AlreadyExists,
    NotFound,
    Unreadable,
    Io,
}

impl ProjectError {
    fn new(code: ProjectErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

impl std::fmt::Display for ProjectError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "{}", self.message)
    }
}

impl From<io::Error> for ProjectError {
    fn from(error: io::Error) -> Self {
        if error.kind() == io::ErrorKind::NotFound {
            return Self::new(ProjectErrorCode::NotFound, error.to_string());
        }
        Self::new(ProjectErrorCode::Io, error.to_string())
    }
}

/// State is a cache of what the user did last, so a corrupt file resets it
/// instead of blocking startup. Project files are never treated this way.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppState {
    pub last_project_dir: Option<String>,
    pub recent: Vec<RecentEntry>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentEntry {
    pub path: String,
    pub name: String,
    pub opened_at: i64,
}

/// Milliseconds since the Unix epoch, used for every timestamp we store.
pub fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as i64)
        .unwrap_or_default()
}

/// Trims a project name and rejects anything that is not a safe single path
/// segment, including Windows device names.
pub fn validate_name(name: &str) -> Result<String, ProjectError> {
    let trimmed = name.trim();

    if trimmed.is_empty() {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidName,
            "Project name must not be empty",
        ));
    }
    if trimmed.chars().count() > MAX_NAME_LENGTH {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidName,
            format!("Project name must be at most {MAX_NAME_LENGTH} characters"),
        ));
    }
    if trimmed.chars().any(|character| character.is_control()) {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidName,
            "Project name must not contain control characters",
        ));
    }
    if trimmed
        .chars()
        .any(|character| r#"<>:"/\|?*"#.contains(character))
    {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidName,
            r#"Project name must not contain any of <>:"/\|?*"#,
        ));
    }
    if trimmed.ends_with('.') {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidName,
            "Project name must not end with a dot",
        ));
    }
    if trimmed == "." || trimmed == ".." {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidName,
            "Project name is not a valid folder entry",
        ));
    }
    let stem = trimmed.split('.').next().unwrap_or_default().trim();
    if WINDOWS_RESERVED_NAMES
        .iter()
        .any(|reserved| stem.eq_ignore_ascii_case(reserved))
    {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidName,
            format!("{stem} is a reserved name on Windows"),
        ));
    }

    Ok(trimmed.to_owned())
}

/// The file name a project gets inside its folder.
pub fn project_file_name(name: &str) -> String {
    format!("{name}.{PROJECT_EXTENSION}")
}

/// Creates `<name>.sym` in `directory`. Fails on an invalid name or a file
/// that already exists.
#[instrument(skip_all, fields(name = %name))]
pub fn create_project_in(
    directory: &Path,
    name: &str,
    id: &str,
    now: i64,
) -> Result<(PathBuf, Project), ProjectError> {
    if !directory.is_absolute() {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidPath,
            "Project folder must be an absolute path",
        ));
    }
    if id.trim().is_empty() {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidPath,
            "Project id must not be empty",
        ));
    }

    let name = validate_name(name)?;
    let path = directory.join(project_file_name(&name));
    if path.exists() {
        return Err(ProjectError::new(
            ProjectErrorCode::AlreadyExists,
            format!("A project named {name} already exists in this folder"),
        ));
    }

    let project = Project {
        version: PROJECT_VERSION,
        id: id.to_owned(),
        name,
        created_at: now,
        updated_at: now,
        sequences: Vec::new(),
    };

    fs::create_dir_all(directory)?;
    write_atomically(
        &path,
        &serde_json::to_string_pretty(&project)
            .map_err(|error| ProjectError::new(ProjectErrorCode::Io, error.to_string()))?,
    )?;
    info!(path = %path.display(), "created project file");

    Ok((path, project))
}

/// Reads a project file. Fails on a relative path, a file without the `.sym`
/// extension, malformed JSON, or a version this build does not support.
#[instrument(skip_all, fields(path = %path.display()))]
pub fn read_project(path: &Path) -> Result<Project, ProjectError> {
    if !path.is_absolute() {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidPath,
            "Project path must be absolute",
        ));
    }
    if path.extension().and_then(|extension| extension.to_str()) != Some(PROJECT_EXTENSION) {
        return Err(ProjectError::new(
            ProjectErrorCode::InvalidPath,
            format!("Project files must end with .{PROJECT_EXTENSION}"),
        ));
    }

    let contents = fs::read_to_string(path)?;
    let project: Project = serde_json::from_str(&contents).map_err(|error| {
        warn!(path = %path.display(), %error, "project file is not readable");
        ProjectError::new(
            ProjectErrorCode::Unreadable,
            format!("Project file could not be read: {error}"),
        )
    })?;

    if project.version != PROJECT_VERSION {
        return Err(ProjectError::new(
            ProjectErrorCode::Unreadable,
            format!(
                "Project version {} is not supported by this build",
                project.version
            ),
        ));
    }

    Ok(project)
}

/// Reads the recent list. A missing or corrupt file starts empty with a log
/// line: this is a cache of what the user did, not user data.
pub fn read_state(path: &Path) -> AppState {
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) => {
            debug!(path = %path.display(), %error, "state file is not readable, starting empty");
            return AppState::default();
        }
    };

    serde_json::from_str(&contents).unwrap_or_else(|error| {
        warn!(path = %path.display(), %error, "state file is corrupt, starting empty");
        AppState::default()
    })
}

/// Writes the recent list atomically.
#[instrument(skip_all, fields(path = %path.display()))]
pub fn write_state(path: &Path, state: &AppState) -> Result<(), ProjectError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let contents = serde_json::to_string_pretty(state)
        .map_err(|error| ProjectError::new(ProjectErrorCode::Io, error.to_string()))?;
    write_atomically(path, &contents)
}

/// Moves `path` to the front of the recent list, records its folder as the
/// place the next project goes, and drops the oldest rows.
pub fn remember(state: &mut AppState, path: &Path, name: &str, now: i64) {
    let path = path.to_string_lossy().into_owned();
    state.recent.retain(|entry| !same_path(&entry.path, &path));
    state.recent.insert(
        0,
        RecentEntry {
            path: path.clone(),
            name: name.to_owned(),
            opened_at: now,
        },
    );
    state.recent.truncate(MAX_RECENT_PROJECTS);
    state.last_project_dir = Path::new(&path)
        .parent()
        .map(|parent| parent.to_string_lossy().into_owned());
}

/// Drops one row. The project file is untouched.
pub fn forget(state: &mut AppState, path: &str) {
    state.recent.retain(|entry| !same_path(&entry.path, path));
}

/// Windows paths differ in case, so `C:\Work\a.sym` and `c:\work\a.sym` are one
/// project and must not show up twice.
fn same_path(left: &str, right: &str) -> bool {
    if cfg!(windows) {
        left.eq_ignore_ascii_case(right)
    } else {
        left == right
    }
}

/// Write to a unique sibling file and rename over the target, so a crash
/// mid-write cannot leave a half-written project behind and no neighbouring
/// file is ever opened for writing.
///
/// shortcut: rename replaces an existing target on Unix, so a file another
/// process creates between the existence check and the rename is overwritten.
/// Upgrade to a create-if-absent rename when concurrent writers exist.
fn write_atomically(path: &Path, contents: &str) -> Result<(), ProjectError> {
    let directory = path.parent().ok_or_else(|| {
        ProjectError::new(
            ProjectErrorCode::InvalidPath,
            "Path must be inside a folder",
        )
    })?;
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("project");
    let temporary = directory.join(format!(
        ".{file_name}.{}.{}.tmp",
        std::process::id(),
        now_millis()
    ));

    let result = (|| -> io::Result<()> {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)?;
        file.write_all(contents.as_bytes())?;
        file.sync_all()?;
        fs::rename(&temporary, path)
    })();

    if let Err(error) = result {
        let _ = fs::remove_file(&temporary);
        return Err(error.into());
    }
    Ok(())
}

fn state_file_path(app: &AppHandle) -> Result<PathBuf, ProjectError> {
    app.path()
        .app_data_dir()
        .map(|directory| directory.join(STATE_FILE))
        .map_err(|error| ProjectError::new(ProjectErrorCode::Io, error.to_string()))
}

/// `Documents/Symbiote`: where a first project goes.
fn default_project_folder(app: &AppHandle) -> Result<PathBuf, ProjectError> {
    app.path()
        .document_dir()
        .map(|directory| directory.join(DEFAULT_PROJECTS_FOLDER))
        .map_err(|error| ProjectError::new(ProjectErrorCode::Io, error.to_string()))
}

/// Rows for the Projects Page, newest first. A row whose file is gone comes
/// back marked `missing` instead of being dropped.
#[instrument(skip_all)]
#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<RecentProject>, ProjectError> {
    let state = read_state(&state_file_path(&app)?);

    Ok(state
        .recent
        .into_iter()
        .map(|entry| {
            let missing = !Path::new(&entry.path).is_file();
            if missing {
                debug!(path = %entry.path, "recent project is missing");
            }
            RecentProject {
                path: entry.path,
                name: entry.name,
                opened_at: entry.opened_at,
                missing,
            }
        })
        .collect())
}

/// The folder a new project should go in: the last one used, else
/// `Documents/Symbiote`.
#[instrument(skip_all)]
#[tauri::command]
pub fn default_project_dir(app: AppHandle) -> Result<String, ProjectError> {
    if let Some(directory) = read_state(&state_file_path(&app)?).last_project_dir {
        if Path::new(&directory).is_dir() {
            return Ok(directory);
        }
    }

    Ok(default_project_folder(&app)?.to_string_lossy().into_owned())
}

/// Writes `<name>.sym` into `directory` and remembers it. Fails on an invalid
/// name or an existing file; never overwrites.
#[instrument(skip_all, fields(name = %name, directory = %directory))]
#[tauri::command]
pub fn create_project(
    app: AppHandle,
    name: String,
    id: String,
    directory: String,
) -> Result<OpenedProject, ProjectError> {
    let state_path = state_file_path(&app)?;
    let now = now_millis();
    let (path, project) = create_project_in(Path::new(&directory), &name, &id, now)?;

    let mut state = read_state(&state_path);
    remember(&mut state, &path, &project.name, now);
    if let Err(error) = write_state(&state_path, &state) {
        warn!(%error, "could not save recent projects after creating a project");
    }

    Ok(OpenedProject {
        path: path.to_string_lossy().into_owned(),
        project,
    })
}

/// Reads a project file and moves it to the front of the recent list. Fails
/// when the path is missing, unreadable, or from a newer version.
#[instrument(skip_all, fields(path = %path))]
#[tauri::command]
pub fn open_project(app: AppHandle, path: String) -> Result<OpenedProject, ProjectError> {
    let state_path = state_file_path(&app)?;
    let project = read_project(Path::new(&path))?;

    let mut state = read_state(&state_path);
    remember(&mut state, Path::new(&path), &project.name, now_millis());
    if let Err(error) = write_state(&state_path, &state) {
        warn!(%error, "could not save recent projects after opening a project");
    }
    info!("opened project file");

    Ok(OpenedProject { path, project })
}

/// Removes the row only. The project file on disk is never touched.
#[instrument(skip_all, fields(path = %path))]
#[tauri::command]
pub fn forget_project(app: AppHandle, path: String) -> Result<(), ProjectError> {
    let state_path = state_file_path(&app)?;
    let mut state = read_state(&state_path);
    forget(&mut state, &path);
    write_state(&state_path, &state)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch_dir(name: &str) -> PathBuf {
        let unique = format!(
            "symbiote-test-{}-{}-{name}",
            std::process::id(),
            now_millis()
        );
        let directory = std::env::temp_dir().join(unique);
        fs::create_dir_all(&directory).expect("create scratch dir");
        directory
    }

    #[test]
    fn creates_a_project_file_that_reads_back() {
        let directory = scratch_dir("roundtrip");

        let (path, created) =
            create_project_in(&directory, "  My Film  ", "id-1", 1_000).expect("create");

        assert_eq!(path.file_name().unwrap(), "My Film.sym");
        assert_eq!(created.name, "My Film");
        assert_eq!(created.version, PROJECT_VERSION);
        assert_eq!(read_project(&path).expect("read"), created);

        fs::remove_dir_all(&directory).unwrap();
    }

    #[test]
    fn refuses_to_overwrite_an_existing_project() {
        let directory = scratch_dir("collision");
        create_project_in(&directory, "Film", "id-1", 1_000).expect("first create");

        let error = create_project_in(&directory, "Film", "id-2", 1_000).expect_err("collision");

        assert_eq!(error.code, ProjectErrorCode::AlreadyExists);
        fs::remove_dir_all(&directory).unwrap();
    }

    #[test]
    fn leaves_no_temporary_file_behind() {
        let directory = scratch_dir("atomic");
        create_project_in(&directory, "Film", "id-1", 1_000).expect("create");

        let leftovers: Vec<_> = fs::read_dir(&directory)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "tmp"))
            .collect();

        assert!(leftovers.is_empty());
        fs::remove_dir_all(&directory).unwrap();
    }

    #[test]
    fn leaves_a_neighbouring_temp_file_alone() {
        let directory = scratch_dir("neighbour");
        let neighbour = directory.join("Film.tmp");
        fs::write(&neighbour, "someone else's file").expect("seed neighbour");

        create_project_in(&directory, "Film", "id-1", 1_000).expect("create");

        assert_eq!(
            fs::read_to_string(&neighbour).expect("read neighbour"),
            "someone else's file"
        );
        assert!(directory.join("Film.sym").is_file());
        fs::remove_dir_all(&directory).unwrap();
    }

    #[test]
    fn rejects_names_that_are_not_safe_file_names() {
        for name in [
            "", "   ", "a/b", "a\\b", "a:b", "a*b", "a?b", "a<b", "a>b", "a|b", "a\"b", "..", "a.",
            "CON", "lpt3.sym",
        ] {
            assert!(validate_name(name).is_err(), "{name:?} should be rejected");
        }
        assert!(validate_name(&"a".repeat(MAX_NAME_LENGTH + 1)).is_err());
        assert_eq!(validate_name("  Film  ").unwrap(), "Film");
        assert_eq!(
            validate_name(&"a".repeat(MAX_NAME_LENGTH)).unwrap().len(),
            MAX_NAME_LENGTH
        );
    }

    #[test]
    fn reports_a_corrupt_project_file_instead_of_resetting_it() {
        let directory = scratch_dir("corrupt");
        let path = directory.join("broken.sym");
        fs::write(&path, "{ not json").unwrap();

        let error = read_project(&path).expect_err("corrupt file");

        assert_eq!(error.code, ProjectErrorCode::Unreadable);
        assert_eq!(fs::read_to_string(&path).unwrap(), "{ not json");
        fs::remove_dir_all(&directory).unwrap();
    }

    #[test]
    fn rejects_a_project_file_from_a_newer_version() {
        let directory = scratch_dir("version");
        let path = directory.join("future.sym");
        let mut project = Project {
            version: PROJECT_VERSION + 1,
            id: "id".into(),
            name: "Future".into(),
            created_at: 0,
            updated_at: 0,
            sequences: Vec::new(),
        };
        fs::write(&path, serde_json::to_string(&project).unwrap()).unwrap();

        assert_eq!(
            read_project(&path).unwrap_err().code,
            ProjectErrorCode::Unreadable
        );
        project.version = PROJECT_VERSION;
        fs::remove_dir_all(&directory).unwrap();
    }

    #[test]
    fn keeps_the_most_recent_project_first_without_duplicates() {
        let mut state = AppState::default();
        let first = Path::new("/projects/First.sym");
        let second = Path::new("/projects/Second.sym");

        remember(&mut state, first, "First", 1);
        remember(&mut state, second, "Second", 2);
        remember(&mut state, first, "First", 3);

        assert_eq!(state.recent.len(), 2);
        assert_eq!(state.recent[0].path, first.to_string_lossy());
        assert_eq!(state.recent[0].opened_at, 3);
        assert_eq!(state.last_project_dir.as_deref(), Some("/projects"));
    }

    #[test]
    fn caps_the_recent_list() {
        let mut state = AppState::default();
        for index in 0..(MAX_RECENT_PROJECTS + 5) {
            let path = format!("/projects/{index}.sym");
            remember(&mut state, Path::new(&path), "Film", index as i64);
        }

        assert_eq!(state.recent.len(), MAX_RECENT_PROJECTS);
        assert_eq!(
            state.recent[0].path,
            format!("/projects/{}.sym", MAX_RECENT_PROJECTS + 4)
        );
    }

    #[test]
    fn state_round_trips_and_resets_when_corrupt() {
        let directory = scratch_dir("state");
        let path = directory.join(STATE_FILE);
        let mut state = AppState::default();
        remember(&mut state, Path::new("/projects/Film.sym"), "Film", 7);

        write_state(&path, &state).expect("write state");
        assert_eq!(read_state(&path), state);
        assert_eq!(
            read_state(&path).last_project_dir.as_deref(),
            Some("/projects")
        );

        fs::write(&path, "nope").unwrap();
        assert_eq!(read_state(&path), AppState::default());

        fs::remove_dir_all(&directory).unwrap();
    }

    #[test]
    fn forget_removes_only_the_row() {
        let mut state = AppState::default();
        remember(&mut state, Path::new("/projects/Film.sym"), "Film", 1);
        remember(&mut state, Path::new("/projects/Other.sym"), "Other", 2);

        forget(&mut state, "/PROJECTS/film.sym");

        let surviving: Vec<_> = state
            .recent
            .iter()
            .map(|entry| entry.name.as_str())
            .collect();
        if cfg!(windows) {
            assert_eq!(surviving, ["Other"]);
        } else {
            assert_eq!(surviving, ["Other", "Film"]);
        }
    }
}
