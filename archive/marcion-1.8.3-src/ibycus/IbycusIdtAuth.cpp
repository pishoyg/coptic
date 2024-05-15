#include "IbycusIdtAuth.h"

__IBYCUS_BEGIN_NAMESPACE

ibyIdFile & operator>>(ibyIdFile & s, ibyIdtAuth & rhs) throw(IbycusParseException)
{
        rhs.block = rhs.length = rhs.start_pos = 0;
        unsigned char c;
        ibyFile::pos_type start_pos = s.tellg();

        s >> c;
        if (c != s.idt_new_auth)
                if (c == s.idt_eof) {
                        s.setstate(s.eofbit);
                        return s;
                } else {
                        throw IbycusParseException("No new author in IDT file", s.tellg());
                }

        s >> rhs.length >> rhs.block;
        rhs.start_pos = s.tellg();
        s.seekg(rhs.length - start_pos); // move to end of author

        return s;
}

void ibyIdtAuth::Read(ibyIdFile & s) throw(IbycusParseException)
{
        s.clear();
        s.seekg(start_pos);
        unsigned char c;
        s >> _id;

        s >> c;
        if (c != s.idt_desc_ab)
                throw IbycusParseException("Error Reading file", s.tellg());
        s >> c;
        if (c != 0)
                throw IbycusParseException("Error Reading file", s.tellg());

        s.GetLenString(_name);
        end_header_ = s.tellg();
}

void ibyIdtAuth::Get(ibyIdFile & idt, const int work, const int sect)
{
        if (work != current_work_index_) {
                idt.clear();
                idt.seekg(end_header_);
                int i;
                for (i = 0; i < work+1; i++)
                        idt >> current_work_;

                current_work_.Read(idt);
                current_work_index_ = work;
        }
}

int ibyIdtAuth::Count(ibyIdFile & idt, const int work)
{
        if (work > -1) { // count the sections in a work
                Get(idt, work);
                return current_work_.Count(idt);
        } else {		 // count the works in an author
                ibyIdtWork temp;
                idt.clear();
                idt.seekg(end_header_); // move pointer to end of auth header
                int count = 0;
                while (!idt.eof()) {
                        idt >> temp;
                        count++;
                }
                return --count;
        }

        return -1; // failure

}

const IbycusId & ibyIdtAuth::End(ibyIdFile & s, int work, int sect)
{
        if (work < 0) {
                work = Count(s, work) - 1;
        }
        Get(s, work, sect);
        return current_work_.End(s, sect);
}


ibylen_t ibyIdtAuth::Block(ibyIdFile & s, const int work,
                                                        const int sect, const IbycusId & id)
                                                        throw(IbycusNoId)
{
        Get(s,work,sect);
        return current_work_.Block(s, sect, id);
}

__IBYCUS_END_NAMESPACE
