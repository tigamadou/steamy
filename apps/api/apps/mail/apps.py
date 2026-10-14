import inspect
from importlib import import_module

from django.apps import AppConfig
from django.apps import apps as django_apps
from django.core.checks import Warning, register
from django.template.exceptions import TemplateDoesNotExist
from django.template.loader import get_template


class MailConfig(AppConfig):
    name = 'apps.mail'

    def ready(self):

        @register
        def mailbase_check(app_configs, **kwargs):
            from .base import MailBase
            errors = []

            for app_config in django_apps.get_app_configs():
                try:
                    mail_module = import_module(f'{app_config.name}.mail')
                    for _name, obj in inspect.getmembers(mail_module):
                        if inspect.isclass(obj) and obj is not MailBase and issubclass(obj, MailBase):
                            try:
                                get_template(obj.get_template())
                            except TemplateDoesNotExist:
                                errors.append(
                                    Warning(
                                        f'Mail template not found at "{obj.get_template()}"',
                                        obj=obj,
                                    )
                                )
                except ModuleNotFoundError:
                    pass

            return errors
