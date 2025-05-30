# Generated by Django 5.1.7 on 2025-04-23 09:39

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("account", "0010_paymentrequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="rating",
            field=models.IntegerField(
                blank=True,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(5),
                ],
            ),
        ),
    ]
