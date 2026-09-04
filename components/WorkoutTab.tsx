"use client";

import { useMemo, useState } from "react";
import {
  createFolder,
  deleteFolder,
  deleteRoutine,
  duplicateRoutine,
  getExercise,
  reorderRoutines,
  startEmptyWorkout,
  startRoutine,
  updateFolder,
  updateRoutine,
} from "@/lib/actions";
import { push } from "@/lib/nav";
import { useStore } from "@/lib/store";
import type { Routine } from "@/lib/types";
import { fmtRelative } from "@/lib/util";
import { IChevronDown, IChevronRight, IChevronUp, ICopy, IEdit, IFolder, IMore, IPlus, ISearch, ITrash } from "./Icons";
import { Confirm, Dialog, MenuItem, Prompt, Sheet, TopBar, toast } from "./ui";

export function routineSummary(r: Routine): string {
  const names = r.exercises.map((we) => getExercise(we.exerciseId)?.name).filter(Boolean) as string[];
  return names.join(", ");
}

export function WorkoutTab() {
  const routines = useStore((s) => s.routines);
  const folders = useStore((s) => s.folders);
  const active = useStore((s) => s.activeWorkout);
  const [newFolder, setNewFolder] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null);
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [renameFolder, setRenameFolder] = useState<string | null>(null);
  const [startBlocked, setStartBlocked] = useState<null | (() => void)>(null);

  const loose = routines.filter((r) => !r.folderId || !folders.some((f) => f.id === r.folderId));
  const menuRoutine = routines.find((r) => r.id === menuFor);
  const folderForMenu = folders.find((f) => f.id === folderMenu);

  const guardStart = (fn: () => void) => {
    if (active) setStartBlocked(() => fn);
    else fn();
  };

  return (
    <div className="screen">
      <TopBar large title="Workout" />
      <div className="content">
        <div className="section-title" style={{ marginTop: 6 }}>
          Quick Start
        </div>
        <button className="btn primary" onClick={() => guardStart(() => startEmptyWorkout())}>
          <IPlus size={18} /> Start Empty Workout
        </button>

        <div className="row-between" style={{ marginTop: 22 }}>
          <div className="section-title" style={{ margin: 0 }}>
            Routines
          </div>
        </div>
        <div className="hstack" style={{ marginTop: 10 }}>
          <button className="btn grow" onClick={() => push({ type: "routineEditor", id: null })}>
            <IEdit size={18} /> New Routine
          </button>
          <button className="btn grow" onClick={() => push({ type: "exploreRoutines" })}>
            <ISearch size={18} /> Explore
          </button>
        </div>

        <div className="row-between" style={{ marginTop: 20 }}>
          <div className="section-title" style={{ margin: 0 }}>
            My Routines ({routines.length})
          </div>
          <button className="iconbtn" aria-label="New folder" onClick={() => setNewFolder(true)}>
            <IFolder size={20} />
          </button>
        </div>

        {routines.length === 0 && folders.length === 0 && (
          <div className="empty">
            <div className="icon">📋</div>
            <h3>No routines yet</h3>
            <p>Create a routine to reuse your favourite workouts, or pick one from Explore.</p>
          </div>
        )}

        {folders.map((f) => {
          const inFolder = routines.filter((r) => r.folderId === f.id);
          return (
            <div key={f.id} style={{ marginTop: 10 }}>
              <div className="hstack">
                <button className="hstack grow" onClick={() => updateFolder(f.id, { collapsed: !f.collapsed })} style={{ padding: "6px 4px", textAlign: "left" }}>
                  {f.collapsed ? <IChevronRight size={18} /> : <IChevronDown size={18} />}
                  <span className="bold">{f.name}</span>
                  <span className="muted small">({inFolder.length})</span>
                </button>
                <button className="iconbtn" onClick={() => setFolderMenu(f.id)} aria-label="Folder options">
                  <IMore />
                </button>
              </div>
              {!f.collapsed &&
                inFolder.map((r) => (
                  <RoutineCard key={r.id} r={r} onMenu={() => setMenuFor(r.id)} onStart={() => guardStart(() => startRoutine(r.id))} />
                ))}
              {!f.collapsed && inFolder.length === 0 && <div className="small muted" style={{ padding: "4px 8px 8px" }}>Empty folder</div>}
            </div>
          );
        })}

        <div style={{ marginTop: 10 }}>
          {loose.map((r) => (
            <RoutineCard key={r.id} r={r} onMenu={() => setMenuFor(r.id)} onStart={() => guardStart(() => startRoutine(r.id))} />
          ))}
        </div>
      </div>

      <Prompt open={newFolder} onClose={() => setNewFolder(false)} title="New Folder" placeholder="Folder name" confirmLabel="Create" onSubmit={(name) => createFolder(name)} />
      <Prompt
        open={!!renameFolder}
        onClose={() => setRenameFolder(null)}
        title="Rename Folder"
        initial={folders.find((f) => f.id === renameFolder)?.name ?? ""}
        onSubmit={(name) => renameFolder && updateFolder(renameFolder, { name })}
      />

      <Sheet open={!!menuRoutine} onClose={() => setMenuFor(null)}>
        {menuRoutine && (
          <>
            <div className="bold" style={{ padding: "4px 8px 8px" }}>
              {menuRoutine.title}
            </div>
            <MenuItem
              icon={<IEdit size={20} />}
              label="Edit Routine"
              onClick={() => {
                setMenuFor(null);
                push({ type: "routineEditor", id: menuRoutine.id });
              }}
            />
            <MenuItem
              icon={<ICopy size={20} />}
              label="Duplicate"
              onClick={() => {
                duplicateRoutine(menuRoutine.id);
                setMenuFor(null);
                toast("Routine duplicated");
              }}
            />
            <MenuItem
              icon={<IFolder size={20} />}
              label="Move to Folder"
              onClick={() => {
                setMenuFor(null);
                setMoveFor(menuRoutine.id);
              }}
            />
            <MenuItem
              icon={<IChevronUp size={20} />}
              label="Move Up"
              onClick={() => {
                const ids = routines.map((r) => r.id);
                const i = ids.indexOf(menuRoutine.id);
                if (i > 0) {
                  [ids[i - 1], ids[i]] = [ids[i]!, ids[i - 1]!];
                  reorderRoutines(ids);
                }
                setMenuFor(null);
              }}
            />
            <MenuItem
              icon={<IChevronDown size={20} />}
              label="Move Down"
              onClick={() => {
                const ids = routines.map((r) => r.id);
                const i = ids.indexOf(menuRoutine.id);
                if (i >= 0 && i < ids.length - 1) {
                  [ids[i + 1], ids[i]] = [ids[i]!, ids[i + 1]!];
                  reorderRoutines(ids);
                }
                setMenuFor(null);
              }}
            />
            <MenuItem
              icon={<ITrash size={20} />}
              label="Delete Routine"
              danger
              onClick={() => {
                setMenuFor(null);
                setConfirmDelete(menuRoutine.id);
              }}
            />
          </>
        )}
      </Sheet>

      <Sheet open={!!moveFor} onClose={() => setMoveFor(null)} title="Move to Folder">
        <button
          className="list-item"
          onClick={() => {
            if (moveFor) updateRoutine(moveFor, { folderId: null });
            setMoveFor(null);
          }}
        >
          <span className="grow name">No folder</span>
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            className="list-item"
            onClick={() => {
              if (moveFor) updateRoutine(moveFor, { folderId: f.id });
              setMoveFor(null);
            }}
          >
            <IFolder size={18} />
            <span className="grow name">{f.name}</span>
          </button>
        ))}
        <button
          className="list-item"
          onClick={() => {
            setMoveFor(null);
            setNewFolder(true);
          }}
        >
          <IPlus size={18} />
          <span className="grow name accent">New Folder</span>
        </button>
      </Sheet>

      <Sheet open={!!folderForMenu} onClose={() => setFolderMenu(null)}>
        {folderForMenu && (
          <>
            <div className="bold" style={{ padding: "4px 8px 8px" }}>
              {folderForMenu.name}
            </div>
            <MenuItem
              icon={<IPlus size={20} />}
              label="Add New Routine"
              onClick={() => {
                setFolderMenu(null);
                push({ type: "routineEditor", id: null, folderId: folderForMenu.id });
              }}
            />
            <MenuItem
              icon={<IEdit size={20} />}
              label="Rename Folder"
              onClick={() => {
                setFolderMenu(null);
                setRenameFolder(folderForMenu.id);
              }}
            />
            <MenuItem
              icon={<ITrash size={20} />}
              label="Delete Folder"
              danger
              onClick={() => {
                setFolderMenu(null);
                setConfirmDeleteFolder(folderForMenu.id);
              }}
            />
          </>
        )}
      </Sheet>

      <Confirm
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete routine?"
        message="This routine will be permanently deleted. Your workout history is kept."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDelete) deleteRoutine(confirmDelete);
          toast("Routine deleted");
        }}
      />
      <Dialog open={!!confirmDeleteFolder} onClose={() => setConfirmDeleteFolder(null)} title="Delete folder?" message="Routines inside can be kept (moved out of the folder) or deleted.">
        <button
          className="btn"
          onClick={() => {
            if (confirmDeleteFolder) deleteFolder(confirmDeleteFolder, false);
            setConfirmDeleteFolder(null);
          }}
        >
          Delete folder, keep routines
        </button>
        <button
          className="btn danger"
          onClick={() => {
            if (confirmDeleteFolder) deleteFolder(confirmDeleteFolder, true);
            setConfirmDeleteFolder(null);
          }}
        >
          Delete folder and routines
        </button>
        <button className="btn" onClick={() => setConfirmDeleteFolder(null)}>
          Cancel
        </button>
      </Dialog>
      <Dialog open={!!startBlocked} onClose={() => setStartBlocked(null)} title="Workout in progress" message="You already have a workout in progress. Discard it and start a new one?">
        <button
          className="btn danger"
          onClick={() => {
            startBlocked?.();
            setStartBlocked(null);
          }}
        >
          Discard and start new
        </button>
        <button className="btn" onClick={() => setStartBlocked(null)}>
          Cancel
        </button>
      </Dialog>
    </div>
  );
}

function RoutineCard({ r, onMenu, onStart }: { r: Routine; onMenu: () => void; onStart: () => void }) {
  const summary = useMemo(() => routineSummary(r), [r]);
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="row-between">
        <button className="bold grow ellipsis" style={{ textAlign: "left", fontSize: 16 }} onClick={() => push({ type: "routineEditor", id: r.id })}>
          {r.title}
        </button>
        <button className="iconbtn" onClick={onMenu} aria-label="Routine options">
          <IMore />
        </button>
      </div>
      <div className="small muted" style={{ marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {summary || "No exercises"}
      </div>
      <div className="tiny faint" style={{ marginTop: 4 }}>
        Updated {fmtRelative(r.updatedAt)}
      </div>
      <button className="btn primary" style={{ marginTop: 10 }} onClick={onStart}>
        Start Routine
      </button>
    </div>
  );
}
