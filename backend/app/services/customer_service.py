from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.models.customer import Customer
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate
from app.services.integrity import constraint_name


class CustomerService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = CustomerRepository(db)

    def create(self, data: CustomerCreate) -> Customer:
        customer = Customer(
            full_name=data.full_name,
            email=str(data.email),
            phone=data.phone,
        )
        try:
            self.repo.add(customer)  # flush here can raise IntegrityError
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            if "email" in constraint_name(exc).lower():
                raise ConflictError(
                    f"A customer with email {data.email!r} already exists."
                ) from exc
            raise
        self.db.refresh(customer)
        return customer

    def get(self, customer_id: int) -> Customer:
        customer = self.repo.get(customer_id)
        if customer is None:
            raise NotFoundError(f"Customer {customer_id} not found.")
        return customer

    def list(self) -> list[Customer]:
        return self.repo.list()

    def delete(self, customer_id: int) -> None:
        customer = self.get(customer_id)
        self.repo.delete(customer)
        try:
            self.db.commit()
        except IntegrityError as exc:
            # ON DELETE RESTRICT on orders.customer_id: a customer with order
            # history is kept so those orders retain a valid owner.
            self.db.rollback()
            raise ConflictError(
                f"Customer {customer_id} cannot be deleted because they have orders."
            ) from exc
