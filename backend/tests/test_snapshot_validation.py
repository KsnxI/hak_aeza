import unittest
from pydantic import ValidationError
from backend.source_schemas import SnapshotInput

class SnapshotValidationTests(unittest.TestCase):
    def data(self):
        return {
            "accounts":[{"id":1,"email":"a@example.test","balance":0,"withdrawBalance":0,
                         "totalReplenished":0,"bonusBalance":0,"bonusState":"locked"}],
            "services":[{"id":1,"ownerId":1,"name":"test-1","paymentTerm":"month","autoProlong":False,
                         "createdAt":"2026-10-20T00:00:00Z","expiresAt":"2026-10-26T00:00:00Z",
                         "status":"active","price":100}],
            "transactions":[],
        }
    def test_valid(self):
        self.assertEqual(SnapshotInput.model_validate(self.data()).services[0].owner_id,1)
    def test_missing_owner(self):
        data=self.data(); data["services"][0]["ownerId"]=999
        with self.assertRaises(ValidationError): SnapshotInput.model_validate(data)
    def test_duplicate(self):
        data=self.data(); data["accounts"].append(dict(data["accounts"][0]))
        with self.assertRaises(ValidationError): SnapshotInput.model_validate(data)
    def test_typo_aliases(self):
        data=self.data(); row=data["services"][0]
        row["pice"]=row.pop("price"); row["paymentTem"]="quater_year"; row.pop("paymentTerm")
        self.assertEqual(SnapshotInput.model_validate(data).services[0].payment_term,"quarter_year")
    def test_naive_date_rejected(self):
        data=self.data(); data["services"][0]["expiresAt"]="2026-10-26T00:00:00"
        with self.assertRaises(ValidationError): SnapshotInput.model_validate(data)
    def test_string_bool_rejected(self):
        data=self.data(); data["services"][0]["autoProlong"]="false"
        with self.assertRaises(ValidationError): SnapshotInput.model_validate(data)
