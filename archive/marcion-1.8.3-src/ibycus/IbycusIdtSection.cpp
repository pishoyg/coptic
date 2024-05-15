#include "IbycusIdtSection.h"

__IBYCUS_BEGIN_NAMESPACE

ibyIdtSection::ibyIdtSection(ibyIdFile & idt)
{
        ibychar_t c;
        idt >> c;
        if (c != idt.idt_new_sect) {
                char tmp[100];
                sprintf(tmp, "No new section in IDT file at %X (%X)", (unsigned int)idt.tellg(), c);
                throw IbycusParseException(tmp);
        }

        idt >> Block_;
        bool keepon = true;
        while (keepon) {
                c = idt.get();
                switch(c) {
                case ibyIdFile::idt_new_work :
                        idt.putback(c);
                        keepon = false;
                        break;
                case ibyIdFile::idt_new_sect :
                        idt.putback(c);
                        keepon = false;
                        break;
                case ibyIdFile::idt_sect_start:
                        idt >> StartId_;
                        break;
                case ibyIdFile::idt_sect_end:
                        idt >> EndId_;
                        break;
                case ibyIdFile::idt_last_id:
                        LastIds_.push_back(IbycusId(idt, idt.last_id));
                        break;
                case ibyIdFile::idt_exc_start:
                        Exceptions_.push_back(ibyIdException(idt));
                        break;
                case ibyIdFile::idt_exc_end:
                        (Exceptions_.back()).SetEnd(idt);
                        break;
                case ibyIdFile::idt_exc_sing:
                        Exceptions_.push_back(ibyIdException(idt));
                        break;
                case ibyIdFile::idt_eof:			// Handles error in format
                        idt.putback(c);
                        keepon = false;
                        break;
                default:
                        throw IbycusParseException("Unexpected byte", idt.tellg());
                }
        }
}

ibylen_t ibyIdtSection::Block(const IbycusId & id) const throw(IbycusNoId)
{
        if (id.IsNull(IbycusId::cl_sect)) {
                return Block_;
        } else {
                if (Span() > 0) {
                        IbycusId last_start = StartId_;
                        unsigned int i;
                        for (i = 0; i < LastIds_.size(); i++) {
                                if (id >= last_start && id <= LastIds_[i]) {
                                        return Block_ + i;
                                }
                        }

                        throw IbycusNoId("Id " + id.ToString() + " not found");
                } else {
                        return Block_;
                }
        }
        return -1;
}

__IBYCUS_END_NAMESPACE
