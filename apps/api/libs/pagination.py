from rest_framework.pagination import PageNumberPagination


class PagePagination(PageNumberPagination):
    """`?page=&pageSize=` → `{count, next, previous, results}` (SPEC-TECHNIQUE §7.1)."""

    page_size = 25
    page_size_query_param = "pageSize"
    max_page_size = 100
