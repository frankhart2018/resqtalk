import pymongo

from service.utils.singleton import singleton
from service.utils.environment import MONGO_HOST
from service.utils.constants import MONGO_DB_NAME
from service.data_models.onboarding import OnboardingRequest


MONGO_COLLECTION_NAME = "user-info"


@singleton
class UserInfoStore:
    def __init__(self):
        client = pymongo.MongoClient(host=MONGO_HOST)
        self.__db = client[MONGO_DB_NAME]
        self.__collection = self.__db[MONGO_COLLECTION_NAME]

    def find_singular_user(self):
        return self.__collection.count_documents({}) > 0

    def get_user_document(self):
        return self.__collection.find_one({})

    def onboard_user(self, onboarding_request: OnboardingRequest):
        self.__collection.insert_one(onboarding_request.model_dump(mode="json"))

    def delete_user(self):
        self.__collection.delete_many({})
