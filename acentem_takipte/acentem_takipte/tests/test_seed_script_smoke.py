from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from acentem_takipte.acentem_takipte import dev_seed
from acentem_takipte.acentem_takipte.doctype.at_renewal_task.at_renewal_task import ATRenewalTask


def _load_seed_module():
    current = Path(__file__).resolve()
    root = next(parent for parent in current.parents if (parent / "scripts" / "reset_and_seed_at_data.py").exists())
    module_path = root / "scripts" / "reset_and_seed_at_data.py"
    spec = importlib.util.spec_from_file_location("at_seed_script", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


seed_script = _load_seed_module()


class TestSeedScriptSmoke(unittest.TestCase):
    def test_insert_named_enables_import_mode_only_during_insert(self):
        inserted = []

        class FakeDoc:
            def __init__(self, payload):
                self.payload = payload

            def insert(self, ignore_permissions=False):
                inserted.append(
                    {
                        "name": self.payload["name"],
                        "ignore_permissions": ignore_permissions,
                        "in_import": seed_script.frappe.flags.in_import,
                    }
                )
                return SimpleNamespace(name=self.payload["name"])

        previous = seed_script.frappe.flags.in_import

        try:
            seed_script.frappe.flags.in_import = False
            with patch.object(seed_script.frappe, "get_doc", side_effect=lambda payload: FakeDoc(payload)):
                inserted_doc = seed_script._insert_named(
                    {
                        "doctype": "AT Segment",
                        "name": "AT-SEG-2026-00001",
                        "segment_name": "Trafik Yenileme - Istanbul",
                    }
                )
        finally:
            seed_script.frappe.flags.in_import = previous

        self.assertEqual(inserted_doc.name, "AT-SEG-2026-00001")
        self.assertEqual(
            inserted,
            [
                {
                    "name": "AT-SEG-2026-00001",
                    "ignore_permissions": True,
                    "in_import": True,
                }
            ],
        )
        self.assertIs(seed_script.frappe.flags.in_import, previous)


    def test_reset_and_seed_demo_data_loads_repo_root_seed_script(self):
        captured = {}

        def fake_run(**kwargs):
            captured.update(kwargs)
            return {"ok": True}

        with patch.object(dev_seed.frappe, "conf", SimpleNamespace(developer_mode=True)):
            with patch.object(dev_seed.runpy, "run_path", return_value={"run": fake_run}) as run_path:
                result = dev_seed.reset_and_seed_demo_data(5, 1, 0, "None", 1)

        expected_path = Path(dev_seed.__file__).resolve().parents[2] / "scripts" / "reset_and_seed_at_data.py"

        self.assertEqual(result, {"ok": True})
        self.assertEqual(Path(run_path.call_args.args[0]), expected_path)
        self.assertEqual(run_path.call_args.kwargs["run_name"], "at_seed_module")
        self.assertEqual(
            run_path.call_args.kwargs["init_globals"],
            {
                "SEED_COUNT": 5,
                "PRESERVE_TEMPLATES": 1,
                "ONLY_IF_NAME_LIKE": None,
                "FORCE_PURGE": 1,
            },
        )
        self.assertEqual(
            captured,
            {
                "seed_count": 5,
                "preserve_templates": True,
                "print_output": False,
                "only_if_name_like": None,
                "force": True,
            },
        )


    def test_renewal_task_on_update_syncs_outcome_side_effect(self):
        doc = ATRenewalTask(
            {
                "doctype": "AT Renewal Task",
                "name": "AT-REN-2026-00001",
                "policy": "POL-0001",
                "customer": "CUS-0001",
                "status": "Done",
                "renewal_date": "2026-04-05",
                "due_date": "2026-03-06",
            }
        )

        with patch(
            "acentem_takipte.acentem_takipte.doctype.at_renewal_task.at_renewal_task.sync_renewal_outcome"
        ) as sync_outcome:
            doc.on_update()

        sync_outcome.assert_called_once_with(doc)