import factory

from apps.accounts.tests.factories import LearnerFactory
from apps.notifications.models import Category, Notification


class NotificationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Notification

    user = factory.SubFactory(LearnerFactory)
    category = Category.LEARNING
    type = "mission_reminder"
    title = factory.Sequence(lambda n: f"Notification {n}")
    message = "Ta prochaine mission t'attend."
    url = "/apprenant"
