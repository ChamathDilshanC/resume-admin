"use client";

import { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/FormControls";
import { ListIcon } from "@/components/icons";
import { GripVerticalIcon } from "lucide-react";
import type { ProjectItem } from "@/lib/types";

export function ProjectPriorityModal({
  items,
  onSave,
}: {
  items: ProjectItem[];
  onSave: (items: ProjectItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [orderedItems, setOrderedItems] = useState<ProjectItem[]>(items);

  // Sync state when items change or modal opens
  useEffect(() => {
    if (open) {
      setOrderedItems(items);
    }
  }, [items, open]);

  const handleSave = () => {
    onSave(orderedItems);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
          />
        }
      >
        <ListIcon className="h-4 w-4" /> Manage Priority
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Project Priority List</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex-1 overflow-y-auto min-h-0">
          <p className="mb-4 text-sm text-gray-500">
            Drag and drop projects to change their order in the generated PDF. The priority number is shown next to the name.
          </p>
          <Reorder.Group
            axis="y"
            values={orderedItems}
            onReorder={setOrderedItems}
            className="flex flex-col gap-2"
          >
            {orderedItems.map((item, index) => (
              <Reorder.Item
                // We use item.name + index to guarantee a unique string key that framer-motion requires.
                key={`${item.name}-${index}`}
                value={item}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-gray-600">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.name || "Untitled Project"}</span>
                </div>
                <GripVerticalIcon className="h-5 w-5 text-gray-400" />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
